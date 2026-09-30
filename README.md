# nest-content-hub

![CI](https://github.com/akonopka/nest-content-hub/actions/workflows/ci.yml/badge.svg)

Content hub z asystentem AI: przyjmuje treści, liczy dla nich embeddingi lokalnym modelem (Ollama) i zapisuje je w bazie wektorowej (Qdrant), żeby można było je potem przeszukiwać semantycznie.

Pełna specyfikacja docelowego zakresu znajduje się w pliku [`Wymagania.md`](Wymagania.md). Bieżący plik opisuje **stan faktyczny** projektu — co już działa.

## Stack

- **NestJS** (Node.js/TypeScript) — API
- **MySQL** (przez Prisma) — dane strukturalne (posty, statusy)
- **RabbitMQ** — kolejki zadań (embedding, obsługa pytań do `/ask`)
- **Ollama** — lokalny model do liczenia embeddingów
- **Qdrant** — baza wektorowa
- **MailHog** + `nodemailer` — wysyłka odpowiedzi mailem (podgląd wiadomości pod `http://localhost:8025`)
- Docker Compose — całe środowisko

## Co obecnie działa

- `POST /posts` — dodanie treści tekstowej, zapis do MySQL ze statusem `PENDING`
- `GET /posts`, `GET /posts/:id` — odczyt postów
- Asynchroniczny worker: po dodaniu posta liczy embedding (Ollama) i zapisuje wektor w Qdrant, zmienia status na `READY` (albo `FAILED` przy błędzie)
- `POST /ask` — pytanie w naturalnym języku i email; zapisuje pytanie do MySQL ze statusem `PENDING` i zwraca od razu status `202` oraz `questionId`, przetwarzanie idzie asynchronicznie przez osobną kolejkę i workera. Agent ma do wyboru dwa narzędzia: `searchContent` (wyszukiwanie semantyczne — embedding pytania → Qdrant → treść z MySQL) do pytań o treść postów, oraz `queryPosts` (zapytanie do MySQL z filtrami `status`/`dateFrom`/`dateTo`, sortowaniem `orderBy` i `limit`) do pytań o metadane — liczby, zakresy dat, najnowszy/najstarszy post. Model sam decyduje, którego narzędzia użyć na podstawie pytania; gdy nie wywoła żadnego, stosowany jest deterministyczny fallback (wyszukiwanie semantyczne z surowym pytaniem użytkownika) — odpowiedź sklejona przez LLM na podstawie wyniku narzędzia. Model ma system prompt instruujący go do odpowiadania po polsku, liczenia zamiast opisywania przy pytaniach o liczbę oraz samodzielnego wyszukiwania najnowszego/najstarszego postu na podstawie danych. Odpowiedź jest zapisywana w bazie (przed wysyłką) i wysyłana mailem na podany adres (wersja tekstowa i HTML, treść w HTML jest escapowana). Status pytania przechodzi przez `PENDING` → `PROCESSING` → `READY` (albo `FAILED` przy błędzie przetwarzania lub nieudanej wysyłce maila)
- `GET /questions/:id` — status pytania i odpowiedź (`id`, `question`, `status`, `answer`; `answer` jest `null`, dopóki pytanie nie ma statusu `READY`). Celowo bez adresu e-mail w odpowiedzi
- Rate limiting (`@nestjs/throttler`): globalnie 10 żądań/minutę na adres IP, a `POST /ask` dodatkowo zawężone do 10 żądań/10 minut (najdroższy endpoint — uruchamia model i wysyła mail)
- Całe API chronione przez HTTP Basic Auth (dane logowania w sekcji "Demo na żywo" niżej)
- Seed danych startowych przy pierwszym uruchomieniu — dodane posty też przechodzą przez pełny pipeline (kolejka → embedding → Qdrant), tak samo jak posty dodane przez `POST /posts`
- Dokumentacja OpenAPI pod `/api/docs` (generowana automatycznie przy starcie)
- Testy e2e (`api/test/posts.e2e-spec.ts`, `api/test/ask.e2e-spec.ts`, `api/test/questions.e2e-spec.ts`) i jednostkowe (`api/src/posts/posts.service.spec.ts`, `api/src/questions/questions.service.spec.ts`, `api/src/ask/ask.service.spec.ts`, `api/src/worker/posts-worker.controller.spec.ts`, `api/src/worker/ask-worker.controller.spec.ts`, `api/src/mail/mail.service.spec.ts`)
- CI/CD (GitHub Actions): lint, build, testy jednostkowe przy każdym pushu/PR; jeśli testy przejdą na `master`, automatyczny deploy na serwer produkcyjny (SSH → `git pull` → `docker compose up -d --build`)

**Jeszcze nie zaimplementowane** (patrz `Wymagania.md`): uploady plików (PDF/audio/obraz).

## Demo na żywo

http://92.5.44.0:3000/api/docs — interaktywna dokumentacja (Swagger), stąd najwygodniej przetestować `/ask` i `/posts`

API jest chronione przez HTTP Basic Auth (przeglądarka poprosi o dane logowania raz, przy pierwszym wejściu):

```
login: demo
hasło: 7868b144b473
```

## Uruchomienie

```bash
cp .env.example .env
docker compose up -d
```

Pierwsze uruchomienie potrwa dłużej — Ollama ściąga modele, `init` robi migracje i seed danych startowych.

API dostępne pod `http://localhost:3000` (port konfigurowalny przez `API_PORT` w `.env`).

## Dokumentacja API

Interaktywna dokumentacja OpenAPI: `http://localhost:3000/api/docs`

## Przykłady

```bash
# dodanie posta tekstowego
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"content": "Przykładowa treść do zaindeksowania."}'

# lista postów
curl http://localhost:3000/posts

# pojedynczy post
curl http://localhost:3000/posts/1

# pytanie do agenta (zwraca 202 z questionId od razu, odpowiedź przychodzi mailem i trafia do bazy)
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Z czego korzysta NestJS do zarządzania zależnościami?", "email": "test@example.com"}'

# status i odpowiedź (questionId z odpowiedzi na powyższe wywołanie)
curl http://localhost:3000/questions/1
```

## Testy

```bash
# jednostkowe (nie wymagają innych serwisów — MySQL/RabbitMQ/Ollama/Qdrant są zamockowane)
docker compose exec api sh -c "npm run test:unit"

# e2e (dotykają prawdziwej bazy/Qdranta, wymagają wszystkich serwisów z docker compose)
docker compose exec api sh -c "npm run test:e2e"
```
