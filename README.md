# Gameshow Platform

An interactive gameshow platform for hosting quiz games with friends.

## Features

- **User Authentication**: Registration with unique tokens (admin-controlled)
- **Buzzer Quiz**: Multiplayer quiz with buzzer mechanism (fastest player wins)
- **Matrix Quiz**: 1v1 Jeopardy-style quiz with categories and difficulty levels
- **Real-time Updates**: Socket.IO powered real-time game updates
- **Quiz Management**: Upload and manage quizzes via JSON files

## Tech Stack

- **Frontend**: Next.js 14, React, shadcn/ui, TypeScript
- **Backend**: Fastify, Socket.IO, better-auth
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Running with Docker Compose

1. Clone the repository
2. Run the application:

```bash
docker-compose up --build
```

3. Access the application at `http://localhost:3000`

### Default Admin Credentials

- Username: `admin`
- Password: `admin123`

**⚠️ Change these credentials in production!**

### Initial Registration Tokens

The seed script creates 3 initial registration tokens:
- `welcome-token-1`
- `welcome-token-2`
- `welcome-token-3`

Use these to register new users.

## Development

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Quiz JSON Format

### Buzzer Quiz

```json
{
  "type": "buzzer",
  "title": "General Knowledge",
  "questions": [
    {
      "question": "Capital of Germany?",
      "answers": ["Berlin", "Munich", "Hamburg", "Cologne"],
      "correctIndex": 0
    }
  ]
}
```

### Matrix Quiz

```json
{
  "type": "matrix",
  "title": "Jeopardy Style",
  "categories": ["Geography", "History", "Science"],
  "difficulties": [100, 200, 300],
  "questions": {
    "Geography-100": {
      "question": "Capital of France?",
      "answer": "Paris"
    }
  ]
}
```

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | - |
| ADMIN_USERNAME | Initial admin username | admin |
| ADMIN_PASSWORD | Initial admin password | admin123 |
| BETTER_AUTH_SECRET | JWT secret key | - |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |
| PORT | Backend server port | 3001 |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:3001 |

## License

MIT
