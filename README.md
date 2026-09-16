# nest-content-hub

Content hub z asystentem AI: przyjmuje treści, liczy dla nich embeddingi lokalnym modelem (Ollama) i zapisuje je w bazie wektorowej (Qdrant), żeby można było je potem przeszukiwać semantycznie.

Pełna specyfikacja docelowego zakresu znajduje się w pliku [`Wymagania.md`](Wymagania.md). Bieżący plik opisuje **stan faktyczny** projektu — co już działa.

## Stack

- **NestJS** (Node.js/TypeScript) — API
- **MySQL** (przez Prisma) — dane strukturalne (posty, statusy)
- **RabbitMQ** — kolejka zadań (embedding)
- **Ollama** — lokalny model do liczenia embeddingów
- **Qdrant** — baza wektorowa
- Docker Compose — całe środowisko

## Co obecnie działa

- `POST /posts` — dodanie treści tekstowej, zapis do MySQL ze statusem `PENDING`
- `GET /posts`, `GET /posts/:id` — odczyt postów
- Asynchroniczny worker: po dodaniu posta liczy embedding (Ollama) i zapisuje wektor w Qdrant, zmienia status na `READY` (albo `FAILED` przy błędzie)
- Seed danych startowych przy pierwszym uruchomieniu — dodane posty też przechodzą przez pełny pipeline (kolejka → embedding → Qdrant), tak samo jak posty dodane przez `POST /posts`
- Dokumentacja OpenAPI pod `/api/docs` + wyeksportowany `api/openapi.json`
- Testy e2e dla `/posts` (`api/test/posts.e2e-spec.ts`)

**Jeszcze nie zaimplementowane** (patrz `Wymagania.md`): `/ask` (agent AI), uploady plików (PDF/audio/obraz), powiadomienia mailem.

## Uruchomienie

```bash
cp .env.example .env
cp api/.env.example api/.env
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
```

## Testy

```bash
docker compose exec api sh -c "npm run test:e2e"
```
