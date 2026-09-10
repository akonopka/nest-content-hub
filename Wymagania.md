# Content Hub z asystentem AI (NestJS)

## Cel projektu

Proof of Concept (PoC) aplikacji typu content hub z wbudowanym asystentem AI.

Użytkownik dodaje treści czterech typów: dane tekstowe, pliki PDF, pliki audio i obrazy. Z każdej z nich powstaje post — aplikacja automatycznie wyciąga z treści tekst lub opis (w zależności od typu treści) i liczy dla niego embedding, opcjonalnie powiadamiając mailem, gdy przetwarzanie się zakończy.

Użytkownik zadaje pytanie o zapisane posty w języku naturalnym, a agent AI sam dobiera narzędzie potrzebne do odpowiedzi — wyszukiwanie semantyczne lub zapytanie strukturalne do bazy — po czym zawsze wysyła odpowiedź mailem.

Dane trzymane są w trzech miejscach: MySQL (posty z ich tekstem/opisem, metadane plików, statusy przetwarzania), MinIO (same pliki) i Qdrant (embeddingi).

## Wymagania infrastrukturalne

Rozwiązanie w pełni oparte na kontenerach. Po `docker compose up -d` całe środowisko wstaje, inicjuje bazy danych i kolejkę, jest gotowe do przyjmowania żądań HTTP.

**Wymagane kontenery:**

* **Serwis API:** NestJS (Node.js)
* **MySQL:** dane strukturalne (posty, metadane plików, statusy przetwarzania)
* **Qdrant:** przechowywanie embeddingów
* **RabbitMQ:** broker kolejki
* **Ollama:** lokalny silnik do generowania embeddingów, rozmów z agentem oraz opisywania obrazów (model wizyjny)
* **Whisper:** lokalna transkrypcja audio na tekst
* **MinIO:** object storage kompatybilny z S3, do przechowywania wgranych plików (pliki PDF, pliki audio, obrazy)
* **MailHog:** serwer przechwytujący e-maile, do testowania wysyłki odpowiedzi agenta oraz powiadomień o zakończonym embeddingu na adres e-mail wskazany przez użytkownika

## Logika aplikacji

### Dodawanie treści

API udostępnia endpointy przyjmujące cztery rodzaje wejścia. Każdy przyjmuje opcjonalne pole `email` — jeśli podane, worker po zakończeniu przetwarzania (status `ready` albo `failed`) wysyła powiadomienie na ten adres, przechwycone przez MailHog:

* `POST /posts` — treść tekstowa wprost w body (JSON), zapisywana do MySQL ze statusem `pending`; krok ekstrakcji jest pomijany (tekst już jest gotowy), do kolejki trafia od razu zadanie dotyczące embeddingu.
* `POST /uploads` (PDF) — plik trafia do MinIO, rekord w MySQL dostaje status `pending`, do kolejki trafia zadanie dotyczące ekstrakcji tekstu ze stron.
* `POST /uploads` (audio) — analogicznie, do kolejki trafia zadanie dotyczące transkrypcji audio przez Whisper.
* `POST /uploads` (obraz) — analogicznie, do kolejki trafia zadanie dotyczące opisu obrazu przez model wizyjny w Ollamie.

Każdy rekord treści ma status (`pending` → `processing` → `ready` / `failed`), widoczny przez `GET /posts/:id`.

### Przetwarzanie asynchroniczne (kolejki)

* Worker ekstrakcji:

  * PDF → tekst wyciągany osobno dla każdej strony (np. `pdfjs-dist`); tekst każdej strony staje się od razu osobnym chunkiem (bez dodatkowego dzielenia)
  * Audio → transkrypcja przez Whisper, tekst dzielony na chunki tak jak zwykły tekst
  * Obraz → opis/OCR przez model wizyjny w Ollamie; wynik dzielony na chunki tak jak zwykły tekst
  * Po sukcesie aktualizuje rekord w MySQL i dodaje do kolejki zadanie dotyczące embeddingu.
* Worker embeddingu: liczy embedding dla każdego chunku i zapisuje odpowiedni punkt w Qdrant; po zapisaniu wszystkich chunków dla treści posta zmienia jego status w MySQL na `ready`. Payload zawiera `post_id`, `chunk_index`, `content_type` (MIME), `embedding_method` (jakiego modelu użyto do wyliczenia embeddingu) oraz `extraction_method` (jaką metodą wyekstrahowano treść danego chunku — biblioteka albo model AI). Przykłady:

  ```json
  // PDF
  {
    "post_id": 123,
    "chunk_index": 0,
    "content_type": "application/pdf",
    "embedding_method": { "provider": "ollama", "model": "nomic-embed-text" },
    "extraction_method": { "type": "node_library", "details": { "name": "pdfjs-dist" } }
  }
  ```

  ```json
  // audio / obraz
  {
    "post_id": 456,
    "chunk_index": 2,
    "content_type": "audio/mpeg",
    "embedding_method": { "provider": "ollama", "model": "nomic-embed-text" },
    "extraction_method": { "type": "llm", "details": { "provider": "ollama", "model": "moondream" } }
  }
  ```
* Błąd na dowolnym etapie zmienia status na `failed` i nie blokuje reszty kolejki.

### Zadawanie pytań (agent z narzędziami)

`POST /ask` przyjmuje pytanie w naturalnym języku oraz adres e-mail (oba pola wymagane):

```json
{ "question": "...", "email": "user@example.com" }
```

Request od razu zwraca `202` z `{ "status": "pending" }` — dalsze przetwarzanie odbywa się asynchronicznie przez kolejkę, tak jak przy uploadach. Odpowiedzi nie ma w response; trafia wyłącznie mailem na podany adres, przechwycona przez MailHog.

Zakolejkowane zadanie trafia do Agenta AI połączonego z Ollamą, który samodzielnie dobiera narzędzie (tool/function calling) w zależności od charakteru pytania:

* **`search_content`** — wyszukiwanie semantyczne: liczy embedding zapytania, wykonuje wyszukiwanie wg podobieństwa w Qdrant, odrzucając wyniki poniżej progu podobieństwa, z pozostałych bierze identyfikatory postów (`post_id`) i dociąga pełną treść postów z MySQL. Jeśli żaden wynik nie przekroczy progu, narzędzie zwraca agentowi pustą listę, a agent w swojej ostatecznej odpowiedzi (wysyłanej potem mailem) informuje użytkownika, że nie znalazł pasującej treści. Używane dla pytań o treść postów — zarówno podaną wprost dla postów tekstowych, jak i wyciągniętą z PDF, audio czy obrazu ("co było powiedziane o...", "na którym zdjęciu jest...").
* **`query_posts`** — zapytanie strukturalne: wykonuje zapytanie SQL bezpośrednio do MySQL, filtrując po id/typie/dacie/statusie. Używane dla pytań ilościowych/faktograficznych ("ile mam plików audio", "jakie posty dodano w tym tygodniu").
* **`send_email_report`** — wysyła gotową odpowiedź na podany adres e-mail. Wiadomość przechwytywana jest przez MailHog.

Agent używa `search_content` i/lub `query_posts` w zależności od charakteru pytania, po czym zawsze na końcu wywołuje `send_email_report`.

## Dane startowe

Repozytorium zawiera seed (kilka przykładowych postów tekstowych), żeby agent miał od razu po czym odpowiadać w `/ask` zaraz po `docker compose up -d`, bez konieczności ręcznego wgrywania plików.

## Kryteria akceptacji (DoD)

* `docker compose up -d` podnosi w pełni działające kontenery z API, MySQL, MinIO, RabbitMQ, Ollamą, Whisper, Qdrant i MailHog.
* Dodanie treści dowolnego typu (tekst/PDF/audio/obraz) tworzy post ze statusem `pending`, który bez ręcznej ingerencji zmienia się na `ready`, a jego treść staje się dostępna dla agenta w `/ask`.
* Podanie pola `email` przy dodawaniu treści skutkuje powiadomieniem mailowym (przechwyconym przez MailHog) po zmianie statusu posta z `pending` na `ready` lub `failed`.
* `POST /ask` zwraca `202` natychmiast, a właściwa odpowiedź agenta (dobierającego semantyczne lub strukturalne narzędzie do charakteru pytania) trafia mailem, przechwyconym przez MailHog, na adres podany w requeście.
* API udostępnia dokumentację OpenAPI pod `/api/docs`.
* W repozytorium znajduje się `README.md` z instrukcją uruchomienia, opisem architektury (przepływ danych od uploadu do odpowiedzi agenta) oraz przykładowymi zapytaniami (curl) do wszystkich endpointów.
