# AI Hackathon Project — Symptom-to-Specialist Triage System

An AI-powered triage assistant that lets users describe their symptoms in Arabic, asks follow-up questions, and suggests the right medical specialty with urgency level. Built with a Laravel REST API, a React frontend, and a planned mobile app.

---

## Project Overview

The system takes Arabic symptom messages from a user, forwards them to an OpenAI-compatible LLM endpoint (RouterPlex / Kimi), parses the structured JSON response, and replies in Egyptian Arabic with possible follow-up questions. Once enough information is gathered, it recommends a specialty (e.g., orthopedics, internal medicine, dermatology) and an urgency level (`normal` or `urgent`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 11 + Sanctum API tokens |
| Frontend | React + Vite |
| Mobile | (planned) |
| LLM | RouterPlex / Kimi (`kimi-k2-7`) |
| Database | SQLite (MVP) |

---

## Quick Start

### Backend

```bash
cd Backend
composer install
cp .env.example .env
# Create SQLite database file
New-Item -Path database/database.sqlite -ItemType File -Force
php artisan migrate:fresh --force
php artisan key:generate
php artisan serve --host=0.0.0.0 --port=8000
```

Make sure `.env` includes:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
KIMI_BASE_URL=https://hackathon.routerplex.com/v1
KIMI_API_KEY=your-routerplex-api-key-here
KIMI_MODEL=kimi-k2-7
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

---

## Backend API Summary

Base URL: `http://localhost:8000/api`

### Authentication

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`

### Conversations

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/{id}`
- `DELETE /api/conversations/{id}`

### Messages

- `POST /api/messages` — send first message (auto-creates conversation)
- `POST /api/conversations/{id}/messages` — reply in existing conversation

All conversation/message routes require a `Bearer` Sanctum token.

---

## AI Response Format

```json
{
  "message": "Egyptian Arabic reply",
  "specialty": "orthopedics | internal_medicine | dermatology | null",
  "urgency": "normal | urgent",
  "conversation_complete": true | false,
  "follow_up_questions": ["..."]
}
```

---

## Project Structure

```
Ai-Hackathon-Project/
├── readme.md
├── Backend/
│   ├── artisan
│   ├── composer.json
│   ├── package.json
│   ├── phpunit.xml
│   ├── vite.config.js
│   ├── readme-original.md
│   ├── readme.md
│   ├── app/
│   │   ├── Console/Commands/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   │   ├── Conversation.php
│   │   │   ├── Message.php
│   │   │   └── User.php
│   │   ├── Providers/
│   │   │   └── AppServiceProvider.php
│   │   └── Services/
│   │       └── AiService.php
│   ├── bootstrap/
│   │   ├── app.php
│   │   ├── providers.php
│   │   └── cache/
│   │       ├── packages.php
│   │       └── services.php
│   ├── config/
│   │   ├── app.php
│   │   ├── auth.php
│   │   ├── cache.php
│   │   ├── cors.php
│   │   ├── database.php
│   │   ├── filesystems.php
│   │   ├── logging.php
│   │   ├── mail.php
│   │   ├── queue.php
│   │   ├── sanctum.php
│   │   ├── services.php
│   │   └── session.php
│   ├── database/
│   │   ├── factories/
│   │   │   └── UserFactory.php
│   │   ├── migrations/
│   │   │   ├── 0001_01_01_000000_create_users_table.php
│   │   │   ├── 0001_01_01_000001_create_cache_table.php
│   │   │   ├── 0001_01_01_000002_create_jobs_table.php
│   │   │   ├── 2026_08_26_000000_create_conversations_table.php
│   │   │   ├── 2026_08_26_000001_create_messages_table.php
│   │   │   └── 2026_08_26_114532_create_personal_access_tokens_table.php
│   │   └── seeders/
│   │       └── DatabaseSeeder.php
│   ├── public/
│   │   ├── index.php
│   │   └── robots.txt
│   ├── resources/
│   │   ├── css/app.css
│   │   ├── js/
│   │   │   ├── app.js
│   │   │   └── bootstrap.js
│   │   └── views/
│   │       └── welcome.blade.php
│   ├── routes/
│   │   ├── api.php
│   │   ├── console.php
│   │   └── web.php
│   ├── storage/
│   │   ├── app/
│   │   │   ├── private/
│   │   │   └── public/
│   │   ├── framework/
│   │   │   ├── cache/
│   │   │   ├── sessions/
│   │   │   ├── testing/
│   │   │   └── views/
│   │   └── logs/
│   ├── tests/
│   │   ├── TestCase.php
│   │   ├── Feature/
│   │   │   ├── AuthFlowTest.php
│   │   │   ├── ConversationTest.php
│   │   │   └── ExampleTest.php
│   │   └── Unit/
│   │       └── ExampleTest.php
│   └── vendor/
│       ├── autoload.php
│       ├── bin/
│       ├── brick/
│       ├── carbonphp/
│       ├── composer/
│       ├── dflydev/
│       ├── doctrine/
│       ├── dragonmantank/
│       ├── egulias/
│       ├── fakerphp/
│       ├── filp/
│       ├── fruitcake/
│       ├── graham-campbell/
│       ├── guzzlehttp/
│       ├── hamcrest/
│       ├── laravel/
│       ├── league/
│       ├── mockery/
│       ├── monolog/
│       ├── myclabs/
│       ├── nesbot/
│       ├── nette/
│       ├── nikic/
│       ├── nunomaduro/
│       ├── openai-php/
│       ├── phar-io/
│       ├── php-http/
│       ├── phpoption/
│       ├── phpunit/
│       ├── psr/
│       ├── psy/
│       ├── ralouphie/
│       ├── ramsey/
│       ├── sebastian/
│       ├── staabm/
│       ├── symfony/
│       ├── theseer/
│       ├── tijsverkoyen/
│       ├── vlucas/
│       └── voku/
├── Frontend/
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── readme.md
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── api.js
│       ├── App.css
│       ├── App.jsx
│       ├── Auth.css
│       ├── Auth.jsx
│       ├── index.css
│       ├── main.jsx
│       └── MessageText.jsx
└── Mobile/
    └── readme.md
```
