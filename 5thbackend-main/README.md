# 📊 Full-Stack Crypto Tracker

A full-stack web application that tracks live cryptocurrency prices using data from the CoinGecko API. The app displays current prices, market caps, and 24-hour price changes, and stores historical data in a database using a background cron job.

---

## 🔧 Tech Stack

### 🖥️ Frontend
- React.js
- Tailwind CSS
- Axios

### 🌐 Backend
- Node.js
- Express.js
# Crypto Tracker — Full-stack (React + Node + MongoDB)

A simple, demo-ready full-stack cryptocurrency tracker. Frontend (React) fetches data from a Node/Express backend which stores current and historical coin data in MongoDB Atlas. The backend also provides authentication (signup/login with JWT).

This README gives a quick setup so you can run the project on another machine and a short checklist to make sure your demo runs smoothly.

---

## Repo layout

- `backend/` — Express app, MongoDB models, authentication, cron jobs to fetch CoinGecko data
- `frontend/` — React app (create-react-app), UI components, signup/login pages

---

## Requirements (local machine)

- Node.js (v18+ recommended)
- npm
- Optional for local MongoDB fallback: Docker (to run a local Mongo instance)

---

## Quick setup (run locally)

1. Clone the repo

```bash
git clone <repo-url>
cd <repo-folder>
```

2. Install backend dependencies and configure env

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with the following keys:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.yourcluster.mongodb.net/yourdbname?retryWrites=true&w=majority
PORT=5001
JWT_SECRET=<a long random secret>
FIREBASE_PROJECT_ID=<your Firebase project id>
FIREBASE_CLIENT_EMAIL=<service account client email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Firebase service account alternative:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

Create a `.env` file in `frontend/` for Firebase email OTP / one-time link auth:

```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_FIREBASE_API_KEY=<firebase web api key>
REACT_APP_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=<your Firebase project id>
REACT_APP_FIREBASE_APP_ID=<firebase web app id>
```

Notes:
- If you plan to demo from your machine using MongoDB Atlas, make sure to add your IP to Atlas Network Access.
- You can use `index-test.js` to run the backend without MongoDB (in-memory users) if Atlas is unreachable.

3. Install frontend and start dev server

```bash
cd ../frontend
npm install
npm start
```

Frontend will be available at `http://localhost:3000`.

4. Start backend

Open a new terminal and run:

```bash
cd backend
node index.js
```

Backend will be available at `http://localhost:5001`.

Useful endpoints:
- `GET /api/health` — server and DB health + last crypto fetch
- `POST /api/auth/register` — register
- `POST /api/auth/login` — login
- `GET /api/coins` — get current coin data
- `GET /api/history/:coinId` — get history for a coin
- `POST /api/history` — trigger a manual fetch of historical data
- `GET /api/alerts` — list authenticated user's price alerts
- `POST /api/alerts` — create a price alert
- `PATCH /api/alerts/:alertId` — pause, reset, or update an alert
- `DELETE /api/alerts/:alertId` — delete an alert

---

## Demo checklist (recommended, 15–20 minutes before demo)

1. In Atlas: make sure cluster is `Running` and your IP is whitelisted (Network Access → Add IP)
2. Start the backend: `cd backend && node index.js`
3. Wait ~30–60 seconds for DB connection messages in backend logs (server.log)
4. Start frontend: `cd frontend && npm start`
5. Smoke test (from your machine):

```bash
curl http://localhost:5001/api/health
curl -i -X POST http://localhost:5001/api/auth/register -H "Content-Type: application/json" -d '{"username":"demo","email":"demo@example.com","password":"password123"}'
curl -i -X POST http://localhost:5001/api/auth/login -H "Content-Type: application/json" -d '{"email":"demo@example.com","password":"password123"}'
```

If any of these fail, try the fallback below.

---

## Fallback options (use if Atlas is paused or your network blocks it)

A) In-memory fallback (fast)

- Run the in-memory test server which doesn't use MongoDB:

```bash
cd backend
node index-test.js
```

- This is intended for UI/demo only — data won't persist across restarts.

B) Local MongoDB via Docker (robust)

- Run a local Mongo container and point your `MONGO_URI` to it:

```bash
docker run -d --name mongo-demo -p 27017:27017 mongo:6.0
# then set in backend/.env:
# MONGO_URI=mongodb://localhost:27017/cryptotracker
```

- Restart backend and demo will use the local DB.

C) Keep-alive pings (prevent pause)

- On some free tiers, activity can keep a cluster warm. A small keepalive script or cron (curl every 5 minutes) against your backend `/api/health` can help.

---

## Production notes / deployment tips

- When deploying, build the frontend (`npm run build`) and serve from the backend (Express static serving is included in `index.js` if `frontend/build` exists).
- Use a secure `JWT_SECRET` in production (store it in production environment variables or secret manager).
- Consider using a managed log/monitoring service for long-running cron jobs.

---

## Development notes

- Cron for crypto fetching is configured to start after DB connection and runs every 5 minutes by default. You can change the cron expression in `controller/Crypto.js` when calling `startScheduledFetch()`.
- If you expect overlapping fetches (long fetch durations), add a simple locking mechanism (e.g., an `isFetching` boolean) to prevent concurrent runs.

---

## Files of interest

- `backend/index.js` — server entry, routing, static-serving, health endpoint
- `backend/controller/Auth.js` — register/login/profile
- `backend/controller/Crypto.js` — fetchData, startScheduledFetch, triggerHistoryDataFetch
- `backend/index-test.js` — lightweight in-memory auth server for demos without DB
- `frontend/src/components/Signup.jsx` and `Login.jsx` — auth UI

---

If you want, I can also:
- Add a `Procfile` and `heroku` or `Dockerfile` for easier deployment
- Add a `make` target or npm script that sets up the whole project for demo
- Add a short `demo.md` that contains the exact terminal commands for your 15-minute run-through

Good luck with your demo — tell me which fallback you'd like me to prepare (keepalive, Docker local Mongo, or the in-memory test server) and I'll add the small scripts and commands to the repo and commit them.

---

## Commit & push

When you're happy with everything, commit and push these changes:

```bash
git add .
git commit -m "Prepare demo: robust DB connection, health endpoint, SPA fallback, scheduling"
git push origin main
```

If you use a different branch name replace `main` with your branch.
