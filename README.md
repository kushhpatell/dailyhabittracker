# Daily Habit Tracker

Full‑stack habit tracker with a React (Vite) client and an Express + MongoDB server.

## Local development

### 1) Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 2) Configure environment

Copy the example env file and update values as needed:

```bash
cd server
copy .env.example .env
```

### 3) Run

In two terminals:

```bash
cd server && npm run dev
```

```bash
cd client && npm run dev
```

Client defaults to `http://localhost:5173` and server to `http://localhost:4000`.

## Notes for deployment

- The server expects MongoDB via `MONGO_URI`.
- Never commit `server/.env` (this repo ignores it). Use your host’s environment variables instead.
