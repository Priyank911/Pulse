<p align="center">
  <img src="./client/public/pulse-logo.svg" alt="Pulse Logo" width="120" />
</p>
<p align="center">
  <img src="./docs/images/pulse-banner.png" alt="Pulse Banner" />
</p>

# Pulse
Pulse is a project management and progress tracking platform built for teams that need clear ownership, live visibility, and consistent execution.

## Product Description
Pulse helps teams manage projects from planning to completion in one workspace. It combines project setup, task assignment, progress updates, and internal communication so everyone can see what is being worked on, who owns it, and how close delivery is.

## Key Capabilities
- Role-based account access for admins and team members
- Project creation with member management and deadlines
- Task lifecycle tracking with Kanban-style workflow
- Daily progress logging with percentage-based updates
- Admin and member dashboards tailored to each role
- Real-time task and progress updates
- Internal notes for team communication

## Product Views
### Dashboard
![Pulse Dashboard](./docs/images/dashboard.png)
### Project Workspace
![Pulse Project Workspace](./docs/images/project-workspace.png)

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL, Prisma |
| Authentication | JWT, bcrypt |
| Realtime | Socket.IO |

## Project Structure
```text
Project Management/
|-- client/
|   |-- public/
|   `-- src/
|-- server/
|   |-- prisma/
|   `-- src/
|-- package.json
|-- README.md
`-- railway.json
```

## Getting Started
### Prerequisites
- Node.js 18 or later
- PostgreSQL database

### Installation
1. Clone the repository.
2. Copy `.env.example` to `.env` in the project root.
3. Install dependencies:
```bash
npm install
```

### Environment Variables
Set these values in `.env`:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/pulse?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Database Setup
```bash
cd server
npx prisma migrate deploy
npx prisma db seed
```

### Run Development
From the repository root:
```bash
npm run dev
```

### Build and Start
```bash
npm run build
npm run start
```

## Demo Accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@pulse.app | admin123 |
| Developer | sarah@pulse.app | dev123 |
| Developer | james@pulse.app | dev123 |

## API Overview
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/users`
### Projects
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `POST /api/projects/:id/members`
### Tasks
- `GET /api/tasks/project/:projectId`
- `GET /api/tasks/my`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
### Progress
- `POST /api/progress`
- `GET /api/progress/dashboard`
- `GET /api/progress/developer`
### Notes
- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:id/read`

## Deployment
This project is configured for Railway deployment through `railway.json` and `Procfile`.
