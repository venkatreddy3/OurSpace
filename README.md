# OurSpace

**A private, shared space for two.** Partners sign in, pair with a short invite code, and get one dashboard for everything couples usually scatter across a dozen apps: a pinboard, a memory timeline, a photo gallery, recommendations, a shared playlist, little games and notes that arrive live.

[![CI](https://github.com/venkatreddy3/OurSpace/actions/workflows/ci.yml/badge.svg)](https://github.com/venkatreddy3/OurSpace/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

- [Features](#features)
- [Tech stack](#tech-stack)
- [How it fits together](#how-it-fits-together)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Security](#security)
- [Scripts](#scripts)
- [Roadmap](#roadmap)

## Features

| Area | What it does |
| --- | --- |
| **Accounts** | Google sign-in, then a short profile (name, gender, date of birth, 16 and over) and a username and password. After that, sign in with Google or with the username. Settings lets people change their password (verifying with the current password or with Google). |
| **Pairing** | Once the profile is complete, each person gets an invite code. Entering a partner's code links the two accounts into one couple. |
| **Home** | A random flirty hello, "Our little world" hotspots, live counts of what you have added, a milestone ring with the next monthiversary and anniversary, a daily conversation starter you can send as a note, and your latest photos. |
| **Pinboard** | An infinite, pannable canvas of sticky notes and photo pins. Eight note designs and nine photo-card designs, each new one different from the last. A new note opens ready to type. Drag, resize, recolour; both partners see changes live. |
| **Memory Stack** | A timeline of memories with photos, mood tags and likes, shown as a vertical timeline, polaroid stack or an orbit of moments with a full-size photo viewer. |
| **Shared Gallery** | Photos uploaded to Cloudinary and listed from Firestore, so both partners see the same gallery. Masonry by default, plus square, polaroid and bounce-card layouts. |
| **Phone upload** | Scan a QR code with your phone, pick photos, and they land in the gallery on your computer. |
| **Recommendations** | A shared watchlist, places list and playlist, each with its own doodle and partner ratings. Movie search uses IMDb's titles feed, places use Wikipedia, songs use the iTunes Search API. |
| **Notes and games** | Short notes pop up on the partner's screen in real time, and game invites and moves are relayed over Socket.io. |
| **Together since** | The couple is asked since when they have been together; every counter starts from that date and either partner can change it. |

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, React Router 7, Framer Motion, GSAP, Lenis
- **Backend:** Node.js, Express, Socket.io, Firebase Admin SDK (TypeScript)
- **Data and auth:** Firebase Authentication and Cloud Firestore
- **Images:** Cloudinary (signed uploads)
- **Hosting:** Vercel for the website, Render for the API (see [Deployment](#deployment))

## How it fits together

```
 Browser (React, hosted on Vercel)
   |-- Firebase Auth ---------------> Google and username sign-in, ID tokens
   |-- Firestore SDK ---------------> memories, pins, gallery, playlist, recommendations
   |        (protected by firestore.rules: members of a couple only)
   |-- Cloudinary upload API -------> photo files (signature from the API)
   |-- REST  /api/auth, /media, /transfer --> Express API (checks the Firebase ID token)
   '-- Socket.io -------------------> Express API (token checked on connect, one room per couple)

 Express API (hosted on Render)  --Admin SDK-->  Firestore (users, couples)
```

Two things are enforced on the server rather than in the browser: pairing (it creates the `couples` document and links both users) and the realtime rooms (a user's room comes from their own `users/{uid}.coupleId`, never from anything the client sends).

## Getting started

### Prerequisites

- Node.js 20 or newer (22 recommended)
- A Firebase project with **Authentication** (Google and Email/Password providers enabled) and **Firestore**
- A Cloudinary account

### 1. Install

```bash
npm install
npm install --prefix server
```

### 2. Configure

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Fill both files in (see [Configuration](#configuration)). Never commit them; they are listed in `.gitignore`.

### 3. Deploy the Firestore rules and indexes

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore
```

This publishes `firestore.rules` and `firestore.indexes.json` to the project named in `.firebaserc`. Change that file if you use your own Firebase project.

### 4. Run

```bash
npm run dev --prefix server   # API and sockets on :5000
npm run dev                   # website on :5173 (forwards /api and /socket.io to :5000)
```

Open <http://localhost:5173/login>. Use `localhost`, not `127.0.0.1`, so Firebase sign-in accepts the origin.

### Demo mode

With no Firebase config the app falls back to a local demo mode: data lives in the browser, a "Bypass Login" button appears, and two tabs act as the two partners. It is meant for working on the UI without any accounts and is off whenever a real Firebase config is present.

## Configuration

### Website (`.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Yes | Firebase web app config (Project settings, Your apps). These identify the project and are not secrets. |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Yes until signed uploads are set up | Cloudinary cloud name and the unsigned preset used as a fallback |
| `VITE_API_URL` | When deployed | The API's address, e.g. `https://ourspace-api.onrender.com`, no trailing slash. Leave empty locally. |
| `VITE_ENABLE_MOCK_AUTH` | No | `true` forces local demo mode |

Vite bakes these in at build time, so after changing one on a host you must redeploy the site.

### API (`server/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Port to listen on (default `5000`; hosts set it for you) |
| `CLIENT_URL` | In production | The website's address, e.g. `https://ourspace.vercel.app`. Several can be given, separated by commas. |
| `NODE_ENV` | Recommended | Set to `production` when deployed. It makes `CLIENT_URL` mandatory and hides error details. |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Yes | Service account credentials. Keep the private key on one line, in double quotes, with `\n` between lines. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Recommended | Lets the API sign photo uploads so only signed-in people can upload |

## Deployment

The website goes on **Vercel** and the API on **Render**, because the API holds long-lived Socket.io connections that serverless hosting can't keep open. The repository already contains the configuration for both (`vercel.json`, `render.yaml`).

**The full step-by-step guide, with every setting to paste, is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).**

In short: deploy the API on Render, import this repository into Vercel with the `VITE_*` variables, set `CLIENT_URL` on Render to the Vercel address, and add the Vercel domain to Firebase's authorized domains.

## Project structure

```
.
|-- src/                      React app
|   |-- components/           UI by feature (home, pinboard, memorystack, gallery, recommendations, games, ...)
|   |-- pages/                Route pages
|   |-- services/             Firebase, Cloudinary, Socket.io and per-feature data access
|   |-- hooks/                Shared hooks (live data, count-up, smooth scroll)
|   |-- store/                Zustand stores (auth, socket, notes, games)
|   |-- utils/                Small helpers (safe URLs)
|   '-- config.ts             Where the API lives (VITE_API_URL)
|-- server/src/               Express API
|   |-- config/               Firebase Admin initialisation
|   |-- controllers/          Login handshake, profile, pairing
|   |-- middlewares/          Firebase ID token verification
|   |-- routes/               /api/auth, /api/media (signed uploads), /api/transfer (phone upload relay)
|   '-- sockets/              Authenticated realtime relay
|-- login-app/                Standalone prototype of a sign-in flow (mock services only)
|-- docs/DEPLOYMENT.md        Deploying to Vercel and Render
|-- firestore.rules           Security rules
|-- firestore.indexes.json    Composite indexes
|-- vercel.json               Vercel settings (SPA fallback, security headers)
|-- render.yaml               Render blueprint for the API
'-- .github/                  CI (typecheck and build) and Dependabot
```

## Security

Access control, abuse limits and hardening are summarised in [SECURITY.md](SECURITY.md), which also explains how to report a vulnerability. Highlights:

- Firestore rules limit every read and write to the two members of a couple; the `users` and `couples` documents are written only by the API.
- The API and Socket.io both require a valid Firebase ID token. Passwords are handled entirely by Firebase and never reach this project's server or database.
- The API throttles requests, locks an account out after repeated wrong invite codes, sends security headers, allows only the configured website origin(s), and returns generic errors in production.
- Photo uploads are signed by the API for signed-in users and limited to image formats.

## Scripts

| Command | Where | What it does |
| --- | --- | --- |
| `npm run dev` | root | Start the Vite dev server |
| `npm run build` | root | Typecheck and build the website into `dist/` |
| `npm run typecheck` | root, `server/` | Typecheck only |
| `npm run dev` | `server/` | Rebuild and restart the API on every change |
| `npm run build` / `npm start` | `server/` | Compile and run the API |

## Roadmap

- Voice notes stored outside Firestore
- More games
- Installable app (PWA) with notifications

## License

MIT, see [LICENSE](LICENSE).
