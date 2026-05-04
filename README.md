<p align="center">
  <img src="./client/public/pulse-banner.png" alt="Pulse — Project Management Platform" width="100%" />
</p>

<p align="center">
  <img src="./client/public/pulse-logo.svg" alt="Pulse Logo" width="80" />
</p>

<p align="center">
  <a href="https://github.com/Priyank911/Pulse/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/Priyank911/Pulse?color=0d0d0d&labelColor=1a1a1a&style=flat-square" alt="License" />
  </a>
  <a href="https://github.com/Priyank911/Pulse/releases">
    <img src="https://img.shields.io/github/v/release/Priyank911/Pulse?color=0d0d0d&labelColor=1a1a1a&style=flat-square" alt="Release" />
  </a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-0d0d0d?labelColor=1a1a1a&style=flat-square" alt="Node Version" />
  <img src="https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Node.js%20%2B%20PostgreSQL-0d0d0d?labelColor=1a1a1a&style=flat-square" alt="Stack" />
  <img src="https://img.shields.io/badge/realtime-Socket.IO-0d0d0d?labelColor=1a1a1a&style=flat-square" alt="Realtime" />
  <img src="https://img.shields.io/badge/deploy-Railway-0d0d0d?labelColor=1a1a1a&style=flat-square" alt="Deploy" />
</p>

<br />

Pulse is a project management and progress tracking platform built for teams that need clear ownership, live visibility, and consistent execution. It gives admins a complete view of every project, task, and developer, while giving team members a focused workspace to track their own work and log daily progress — all in one shared environment, updated in real time.

---

## What Pulse Does

Teams struggle to answer three questions consistently: what is being built, who owns it, and how far along it is. Pulse is built around those three questions.

An admin creates projects, assigns members, and breaks work into tasks with priorities, due dates, and assignees. Each task moves through a four-stage lifecycle — Todo, In Progress, In Review, Done. Developers log daily progress against their tasks with a completion percentage and a written update. Those logs automatically advance task status and feed into dashboard analytics visible to the whole team. Team members can also send direct notes to one another, scoped to a project or general, delivered through Socket.IO in real time.

The result is a single workspace where delivery accountability is built into the workflow rather than bolted on through stand-ups and status emails.

---

## Dashboard

<p align="center">
  <img src="./docs/images/dashboard.png" alt="Pulse Admin Dashboard" width="100%" />
</p>

The admin dashboard surfaces a live completion ring, four stat cards covering total projects, tasks, in-progress work, and overdue items, a per-project progress breakdown, a developer performance table, and a real-time feed of recent progress logs. Every widget refreshes automatically when a progress entry is submitted or a task is updated anywhere on the platform.

## Project Workspace

<p align="center">
  <img src="./docs/images/project-workspace.png" alt="Pulse Project Workspace" width="100%" />
</p>

The project detail view shows a Kanban board across all four task statuses alongside a team member roster and project metadata. Tasks can be filtered by status, priority, and assignee. Each task card displays its priority badge, due date, assignee avatar, and the latest progress percentage. Members can open a task to log a progress update inline.

---

## Features

**Role-based access.** Two global roles — Admin and Member — with additional per-project roles of Maintainer and Developer. Middleware enforces both at the route level before any database operation runs.

**Project lifecycle management.** Admins create projects with a name, description, deadline, and initial member set. Projects carry an Active, Completed, or Archived status. Progress across all tasks is aggregated into a single project-level percentage computed from the latest log per task.

**Kanban task tracking.** Tasks have a four-stage status workflow, four priority levels (Low, Medium, High, Urgent), optional due dates, and dedicated assignee and creator relationships. The board sorts tasks by priority descending and creation date descending by default, with query-level filters for status, priority, and assignee.

**Progress logging with auto-advancement.** Developers submit a daily log with a percentage and a written description. The server reads the task's current status and auto-transitions it: a log at any percentage above zero on a Todo task moves it to In Progress; a log at one hundred percent moves it to Done. This keeps task status accurate without requiring manual updates.

**Real-time updates via Socket.IO.** Clients join a project room on navigation and a user room on login. Task creation, task update, and progress log events are broadcast to the relevant rooms. Admin dashboards subscribe to progress and task events and re-fetch analytics on each event without requiring a page reload.

**Internal notes.** Team members send direct notes to any other user, optionally scoped to a project. Notes are delivered in real time to the recipient's user room and marked as read through a dedicated endpoint. The notes page shows both sent and received messages in chronological order.

**Tailored dashboards.** Admins see aggregate analytics, per-project health, developer workload, and a live activity feed. Members see their own task board grouped by status, a personal completion rate, an overdue counter, a progress log form, and a record of today's submissions.

---

## Architecture

```mermaid
graph TD
    subgraph Client["Client — React + Vite"]
        A[Browser] --> B[React Router]
        B --> C{Role?}
        C -->|ADMIN| D[AdminDashboard]
        C -->|MEMBER| E[MemberDashboard]
        B --> F[Projects]
        B --> G[ProjectDetail]
        B --> H[Notes]
        D & E & G -.->|Socket.IO events| SC[SocketContext]
        SC -.->|task:created / task:updated\nprogress:logged / note:received| D & E & G
    end

    subgraph Auth["Auth Layer"]
        J[JWT Bearer Token] --> K[auth middleware]
        K --> L[rbac middleware]
    end

    subgraph Server["Server — Express + Node.js"]
        L --> M[/api/auth]
        L --> N[/api/projects]
        L --> O[/api/tasks]
        L --> P[/api/progress]
        L --> Q[/api/notes]
    end

    subgraph ORM["Data Layer — Prisma ORM"]
        M & N & O & P & Q --> R[PrismaClient]
        R --> S[(PostgreSQL)]
    end

    subgraph Realtime["Realtime — Socket.IO"]
        O -->|emit task:created / task:updated| T[project room]
        P -->|emit progress:logged| T
        Q -->|emit note:received| U[user room]
        T & U --> SC
    end

    A -->|HTTP REST| Server
    A <-->|WebSocket| Realtime
```

**Request path.** Every HTTP request from the browser hits the Express server through the auth middleware, which validates the JWT and attaches the user to the request. Routes that require project membership run the additional `requireProjectRole` check, which queries the `project_members` table before proceeding. The route handler then calls Prisma, which translates the query to PostgreSQL and returns typed result objects.

**Realtime path.** When a task is created or updated, or when a progress log is submitted, the route handler emits a named Socket.IO event to the relevant project room using the `req.io` reference attached by middleware. When a note is sent, the event goes to the recipient's user room. Clients listening on those rooms receive the event and trigger a data re-fetch, keeping dashboards and boards live without polling.

**Progress auto-advancement.** On every progress log submission, the server reads the task's current status before writing the log. If the log percentage is greater than zero and the task is still in Todo, the server issues a second Prisma update to move the task to In Progress. If the percentage is one hundred, the task moves to Done. This logic runs synchronously within the same request before the Socket.IO event is emitted, so clients always receive the correct post-update task status in the event payload.

---

## Data Model

```mermaid
erDiagram
    User {
        uuid id PK
        string email UK
        string name
        string password
        string avatar
        enum role
    }
    Project {
        uuid id PK
        string name
        string description
        enum status
        datetime deadline
    }
    ProjectMember {
        uuid id PK
        uuid userId FK
        uuid projectId FK
        enum role
    }
    Task {
        uuid id PK
        string title
        string description
        enum status
        enum priority
        datetime dueDate
        uuid projectId FK
        uuid assigneeId FK
        uuid creatorId FK
    }
    ProgressLog {
        uuid id PK
        int percentage
        string description
        datetime date
        uuid taskId FK
        uuid userId FK
    }
    Note {
        uuid id PK
        string content
        boolean isRead
        uuid senderId FK
        uuid receiverId FK
        uuid projectId FK
    }

    User ||--o{ ProjectMember : "belongs to"
    Project ||--o{ ProjectMember : "has"
    Project ||--o{ Task : "contains"
    User ||--o{ Task : "assigned to"
    User ||--o{ Task : "created"
    Task ||--o{ ProgressLog : "tracks"
    User ||--o{ ProgressLog : "logs"
    User ||--o{ Note : "sends"
    User ||--o{ Note : "receives"
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, Vite | Component rendering and bundling |
| Routing | React Router v6 | Client-side navigation and protected routes |
| Styling | CSS custom properties | Design tokens, layout, component styles |
| Charts | Recharts | Progress and analytics visualizations |
| Icons | Lucide React | Consistent iconography |
| Notifications | React Hot Toast | In-app feedback toasts |
| HTTP Client | Axios | REST calls with auth header injection |
| Realtime Client | Socket.IO Client | Live event subscription |
| Backend | Node.js, Express | REST API and WebSocket server |
| ORM | Prisma 5 | Type-safe database access and migrations |
| Database | PostgreSQL | Persistent relational storage |
| Auth | JWT, bcryptjs | Token issuance and password hashing |
| Validation | express-validator | Request body validation middleware |
| Realtime Server | Socket.IO | Room-based event broadcasting |
| Deployment | Railway | Hosted platform with Procfile and railway.json |

---

## Project Structure

```text
Pulse/
├── client/
│   ├── public/
│   │   ├── pulse-banner.png
│   │   ├── pulse-logo.svg
│   │   ├── pulse-logo-light.svg
│   │   └── favicon.svg
│   └── src/
│       ├── components/
│       │   └── Layout/
│       │       ├── AppLayout.jsx
│       │       └── Sidebar.jsx
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── SocketContext.jsx
│       ├── pages/
│       │   ├── AdminDashboard.jsx
│       │   ├── MemberDashboard.jsx
│       │   ├── Projects.jsx
│       │   ├── ProjectDetail.jsx
│       │   ├── Notes.jsx
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       ├── utils/
│       │   ├── api.js
│       │   └── helpers.js
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── clear.js
│   └── src/
│       ├── middleware/
│       │   ├── auth.js
│       │   ├── rbac.js
│       │   └── validate.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── projects.js
│       │   ├── tasks.js
│       │   ├── progress.js
│       │   └── notes.js
│       ├── socket.js
│       └── index.js
├── .env.example
├── package.json
├── Procfile
└── railway.json
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- A PostgreSQL database (local or hosted)

### Clone and Install

```bash
git clone https://github.com/Priyank911/Pulse.git
cd Pulse
npm install
```

The root `package.json` installs dependencies for both client and server in one command.

### Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/pulse?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

`DATABASE_URL` is passed directly to Prisma. `JWT_SECRET` is used to sign and verify all tokens. `CLIENT_URL` is used for CORS origin allowlisting.

### Database Setup

```bash
cd server
npx prisma migrate deploy
npx prisma db seed
```

The seed script creates three accounts and a sample project with tasks so you can explore the platform immediately after setup.

### Run in Development

From the repository root:

```bash
npm run dev
```

This starts both the Vite dev server on port 5173 and the Express server on port 4000 concurrently.

### Build and Start

```bash
npm run build
npm run start
```

The build step compiles the React client. The start command runs `npx prisma migrate deploy` before starting the Node.js server, which also serves the compiled client from its static output directory.

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Authenticate and receive a JWT |
| GET | `/api/auth/me` | Return the authenticated user's profile |
| GET | `/api/auth/users` | List all users (used for note recipient selection) |

### Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List all projects where the caller is a member |
| POST | `/api/projects` | Create a project (Admin only) |
| GET | `/api/projects/:id` | Fetch a project with members, tasks, and progress |
| PUT | `/api/projects/:id` | Update project name, description, status, or deadline |
| POST | `/api/projects/:id/members` | Add a member to a project |

### Tasks

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks/project/:projectId` | List tasks for a project with optional status, priority, and assignee filters |
| GET | `/api/tasks/my` | List tasks assigned to the caller |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update title, description, status, priority, due date, or assignee |

### Progress

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/progress` | Log a progress entry against a task |
| GET | `/api/progress/dashboard` | Aggregate analytics for admin view |
| GET | `/api/progress/developer` | Personal task and log data for member view |
| GET | `/api/progress/task/:taskId` | Full log history for a single task |

### Notes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notes` | Fetch all sent and received notes for the caller |
| POST | `/api/notes` | Send a note to a user |
| PUT | `/api/notes/:id/read` | Mark a note as read |

---

## Socket.IO Events

| Event | Direction | Room | Payload |
|---|---|---|---|
| `join:project` | Client emits | — | `projectId` |
| `leave:project` | Client emits | — | `projectId` |
| `join:user` | Client emits | — | `userId` |
| `task:created` | Server emits | `project:{id}` | Full task object |
| `task:updated` | Server emits | `project:{id}` | Full task object |
| `progress:logged` | Server emits | `project:{id}` | Log object with `taskStatus` |
| `note:received` | Server emits | `user:{id}` | Full note object |

---

## Demo Accounts

The seed script creates the following accounts for immediate exploration:

| Role | Email | Password |
|---|---|---|
| Admin | admin@pulse.app | admin123 |
| Developer | sarah@pulse.app | dev123 |
| Developer | james@pulse.app | dev123 |

Log in as the admin to see the full dashboard and create projects. Log in as a developer to see the member view and submit progress logs.

---

## Deployment

Pulse is configured for Railway deployment out of the box.

The `Procfile` defines the web process command. The `railway.json` file specifies the build and start commands for Railway's build pipeline. Set the environment variables listed above in your Railway service and connect a PostgreSQL plugin — Railway will inject `DATABASE_URL` automatically if you use its managed database.

The Express server serves the compiled React client as static files in production, so only one service is needed for both the API and the UI.

---

## Contributing

Bug reports, feature requests, and pull requests are welcome. Open an issue first for anything beyond a small fix so the approach can be discussed before implementation begins.

---

## License

Pulse is released under the MIT License. See [LICENSE](./LICENSE) for the full text.

---

<p align="center">
  <img src="./client/public/pulse-logo-light.svg" alt="Pulse" width="48" />
  <br />
  <sub>Built by <a href="https://github.com/Priyank911">Priyank911</a></sub>
</p>