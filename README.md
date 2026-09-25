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
- Docker Compose — całe środowisko

## Co obecnie działa

- `POST /posts` — dodanie treści tekstowej, zapis do MySQL ze statusem `PENDING`
- `GET /posts`, `GET /posts/:id` — odczyt postów
- Asynchroniczny worker: po dodaniu posta liczy embedding (Ollama) i zapisuje wektor w Qdrant, zmienia status na `READY` (albo `FAILED` przy błędzie)
- `POST /ask` — pytanie w naturalnym języku i email; zapisuje pytanie do MySQL ze statusem `PENDING` i zwraca `202` z `questionId` od razu, przetwarzanie idzie asynchronicznie przez osobną kolejkę i workera. W workerze narzędzie `search_content` (embedding pytania → Qdrant → treść z MySQL) jest wywoływane zawsze, z pytaniem od modelu jeśli sam o nie poprosił, albo surowym pytaniem użytkownika w przeciwnym razie (deterministyczny fallback) — odpowiedź sklejona przez LLM na podstawie wyniku. Model ma system prompt instruujący go do odpowiadania po polsku. Na razie odpowiedź trafia tylko do logów workera (bez zapisu do bazy i bez maila)
- Seed danych startowych przy pierwszym uruchomieniu — dodane posty też przechodzą przez pełny pipeline (kolejka → embedding → Qdrant), tak samo jak posty dodane przez `POST /posts`
- Dokumentacja OpenAPI pod `/api/docs` + wyeksportowany `api/openapi.json`
- Testy e2e (`api/test/posts.e2e-spec.ts`, `api/test/ask.e2e-spec.ts`) i jednostkowe (`api/src/posts/posts.service.spec.ts`, `api/src/questions/questions.service.spec.ts`, `api/src/ask/ask.service.spec.ts`, `api/src/worker/posts-worker.controller.spec.ts`, `api/src/worker/ask-worker.controller.spec.ts`)
- CI (GitHub Actions): lint, build, testy jednostkowe przy każdym pushu/PR

**Jeszcze nie zaimplementowane** (patrz `Wymagania.md`): zapis odpowiedzi `/ask` do bazy i powiadomienie mailem, drugie narzędzie agenta (`query_posts`), uploady plików (PDF/audio/obraz).

## Uruchomienie

```bash
cp .env.example .env
docker compose up -d
```

Pierwsze uruchomienie potrwa dłużej — Ollama ściąga modele, `init` robi migracje i seed danych startowych.

API dostępne pod `http://localhost:3000` (port konfigurowalny przez `API_PORT` w `.env`).

## Dokumentacja API

Interaktywna dokumentacja OpenAPI: `http://localhost:3000/api/docs`
Specyfikacja OpenAPI (statyczny plik): [`api/openapi.json`](api/openapi.json)

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

# pytanie do agenta (zwraca 202 od razu, odpowiedź na razie tylko w logach workera)
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Z czego korzysta NestJS do zarządzania zależnościami?", "email": "test@example.com"}'
```

## Testy

```bash
# jednostkowe (szybkie, bez zależności od Dockera)
docker compose exec api sh -c "npm run test:unit"

# e2e (wymagają uruchomionego docker compose)
docker compose exec api sh -c "npm run test:e2e"
```
