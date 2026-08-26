# Symptom-to-Specialist Triage System - Laravel Backend

A minimal Laravel REST API that receives Arabic symptom messages from a React frontend, forwards them to the OpenAI-compatible **RouterPlex / Kimi** endpoint, and returns structured JSON responses in Egyptian Arabic.

---

## Requirements

- PHP >= 8.2
- Composer
- SQLite (default for MVP) or MySQL/PostgreSQL

---

## Quick Start

1. **Install dependencies** (already done after scaffolding):

   ```bash
   composer install
   ```

2. **Copy environment file**:

   ```bash
   cp .env.example .env
   ```

3. **Set required variables in `.env`**:

   ```env
   APP_URL=http://localhost:8000
   FRONTEND_URL=http://localhost:5173

   DB_CONNECTION=sqlite
   DB_DATABASE=database/database.sqlite

   KIMI_BASE_URL=https://hackathon.routerplex.com/v1
   KIMI_API_KEY=your-routerplex-api-key-here
   KIMI_MODEL=kimi-k2-7
   ```

4. **Create the SQLite database file**:

   ```bash
   New-Item -Path database/database.sqlite -ItemType File -Force
   ```

5. **Run migrations**:

   ```bash
   php artisan migrate:fresh --force
   ```

6. **Generate app key** (if not generated):

   ```bash
   php artisan key:generate
   ```

7. **Start the server**:

   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```

---

## API Overview

Base URL: `http://localhost:8000/api`

### Authentication

All conversation routes require a Sanctum token. Register or login first.

#### Register

```http
POST /api/register
Content-Type: application/json

{
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "password": "password",
  "password_confirmation": "password"
}
```

**Response:**

```json
{
  "user": { "id": 1, "name": "Ahmed", "email": "ahmed@example.com" },
  "token": "1|xxxxxxxxxxxx"
}
```

#### Login

```http
POST /api/login
Content-Type: application/json

{
  "email": "ahmed@example.com",
  "password": "password"
}
```

**Response:**

```json
{
  "user": { "id": 1, "name": "Ahmed", "email": "ahmed@example.com" },
  "token": "1|xxxxxxxxxxxx"
}
```

#### Logout

```http
POST /api/logout
Authorization: Bearer <token>
```

---

### Conversations

#### Create conversation

```http
POST /api/conversations
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": 1,
  "user_id": 1,
  "specialty": null,
  "urgency": "normal",
  "is_complete": false,
  "messages": [],
  "created_at": "...",
  "updated_at": "..."
}
```

#### List conversations

```http
GET /api/conversations
Authorization: Bearer <token>
```

#### Get conversation

```http
GET /api/conversations/{conversation}
Authorization: Bearer <token>
```

#### Delete conversation

```http
DELETE /api/conversations/{conversation}
Authorization: Bearer <token>
```

---

### Messages

#### Send first message (auto-creates conversation)

```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "عندي ألم في الركبة بقاله أسبوع"
}
```

**Response:**

```json
{
  "conversation": {
    "id": 1,
    "user_id": 1,
    "specialty": null,
    "urgency": "normal",
    "is_complete": false,
    "messages": [
      { "role": "user", "content": "عندي ألم في الركبة بقاله أسبوع" },
      { "role": "assistant", "content": "...", "metadata": { "specialty": null, "urgency": "normal", "conversation_complete": false, "follow_up_questions": [...] } }
    ]
  },
  "ai_response": {
    "message": "تمام، الألم بيزيد لما تمشي أو تطلع السلالم؟",
    "specialty": null,
    "urgency": "normal",
    "conversation_complete": false,
    "follow_up_questions": ["الألم بيزيد لما تمشي أو تطلع السلالم؟"]
  }
}
```

#### Reply in existing conversation

```http
POST /api/conversations/{conversation}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "أيوه بيزيد لما أطلع السلم"
}
```

---

## AI Response Format

Every assistant reply is parsed into this JSON structure:

```json
{
  "message": "string (Egyptian Arabic reply)",
  "specialty": "string | null",
  "urgency": "normal | urgent",
  "conversation_complete": true | false,
  "follow_up_questions": ["string"]
}
```

Supported specialties:

| ID | Description |
|---|---|
| `orthopedics` | العظام |
| `internal_medicine` | الباطنة |
| `dermatology` | الجلدية |
| `ophthalmology` | العيون |
| `cardiology` | القلب |
| `neurology` | المخ والأعصاب |
| `dentistry` | الأسنان |
| `ent` | أنف وأذن وحنجرة |
| `pediatrics` | أطفال |

---

## Safety Rules

The AI system prompt enforces:

- No disease diagnosis.
- No medication prescriptions.
- Detects red-flag symptoms and returns `urgency: urgent` with advice to seek emergency care.
- Asks follow-up questions only when needed.
- Remembers conversation context.
- Replies in simple Egyptian Arabic.

---

## Testing

Run the test suite:

```bash
php artisan test
```

Tests cover:

- Registration / login
- Guest rejection
- Conversation CRUD + ownership
- Message validation
- AI response handling (mocked)
- Red-flag symptom handling

---

## Project Structure

```
app/
  Http/
    Controllers/
      Api/
        AuthController.php
        ConversationController.php
        MessageController.php
  Models/
    Conversation.php
    Message.php
    User.php
  Services/
    AiService.php        # Kimi/RouterPlex integration
config/
  cors.php               # Allows FRONTEND_URL
  services.php           # Kimi credentials
database/
  migrations/
    ...
routes/
  api.php
```

---

## Notes

- The API key must be kept in `.env` only and never exposed to the frontend.
- The default database is SQLite for fast MVP development; switch to MySQL/PostgreSQL later by updating `.env`.
- RouterPlex supports OpenAI-compatible requests; the app uses `openai-php/client` with a custom base URL.
- CORS is configured to allow the React frontend origin defined in `FRONTEND_URL`.
