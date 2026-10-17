# OurSpace

A private, shared space for two. Partners sign in with Google, pair with a six-character invite code, and get a dashboard for the things couples keep in a dozen different apps: a pinboard, a memory timeline, a photo gallery, recommendations, a shared playlist, little games and quick notes that arrive live.

## Features

| Area | What it does |
| --- | --- |
| **Accounts** | Google sign-in through Firebase Auth, then a short profile (name, gender, date of birth, 16 and over) and a username and password. After that, people can sign in with Google or with their username, and change their password from Settings (verifying with the current password or with Google). |
| **Pairing** | Once the profile is complete, each user gets an invite code; entering a partner's code links the two accounts into one couple. |
| **Pinboard** | An infinite, pannable canvas of sticky notes and photo pins. Drag, resize and recolour; both partners see changes live. |
| **Memory Stack** | A timeline of memories with photos, mood tags and likes, shown as a vertical timeline, polaroid stack or orbit deck. |
| **Shared Gallery** | Photos uploaded to Cloudinary and listed from Firestore, so both partners see the same gallery. Four layouts (square, masonry, polaroid, bounce cards). |
| **Phone upload** | Scan a QR code with your phone, pick photos and they land in the desktop gallery. |
| **Recommendations** | A shared watchlist, places and general list with partner ratings. Title search uses IMDb suggestions and Wikipedia. |
| **Playlist** | Recommend songs with a note. Song search uses the iTunes Search API; partners rate what they have heard. |
| **Notes and games** | Short notes pop up on the partner's screen in real time, and game invites and moves are relayed over Socket.io. |
| **Relationship clock** | A running counter since the day you got together. It starts at zero; the couple is asked since when they are together, and either partner can change the date later in Settings. |

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, React Router, Framer Motion, GSAP, Lenis
- **Backend:** Node.js, Express, Socket.io, Firebase Admin SDK (TypeScript)
- **Data and auth:** Firebase Authentication (Google) and Cloud Firestore
- **Images:** Cloudinary (unsigned upload preset)

## How it fits together

```
 Browser (React)
   |-- Firebase Auth ------------------> Google sign-in, ID tokens
   |-- Firestore SDK ------------------> memories, pins, gallery, playlist, recommendations
   |        (protected by firestore.rules: members of a couple only)
   |-- Cloudinary upload API ----------> photo files
   |-- REST  /api/auth, /api/transfer -> Express (verifies the Firebase ID token)
   '-- Socket.io ----------------------> Express (token checked on connect, one room per couple)

 Express  --Admin SDK-->  Firestore (users, couples)
```

Two things are enforced on the server rather than in the browser: pairing (it creates the `couples` document and links both users) and the realtime rooms (a user's room comes from their own `users/{uid}.coupleId`, never from anything the client sends).

## Getting started

### Prerequisites

- Node.js 22 or newer
- A Firebase project with **Authentication** (Google and Email/Password providers both enabled) and **Firestore** enabled
- A Cloudinary account with an **unsigned upload preset**

### 1. Install

```bash
npm install
npm install --prefix server
```

### 2. Configure

Copy the example files and fill them in:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

**Frontend (`.env`)**

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase web app config (Project settings, Your apps) |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary cloud name and the unsigned preset name |
| `VITE_ENABLE_MOCK_AUTH` | Optional. `true` forces local mock mode |

**Backend (`server/.env`)**

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port (default `5000`) |
| `CLIENT_URL` | Allowed browser origin for CORS and Socket.io (default `http://localhost:5173`) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Service account credentials. Keep the private key on one line, in double quotes, with `\n` between lines |
| `NODE_ENV` | Set to `production` when deployed. In production `CLIENT_URL` becomes mandatory and error details are hidden |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional but recommended: lets the API issue signed upload signatures, so only signed-in users can upload photos |

Never commit `.env` files or the service account JSON. They are listed in `.gitignore`.

### 3. Deploy the Firestore rules and indexes

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore
```

This publishes `firestore.rules` and `firestore.indexes.json` to the project named in `.firebaserc`. Change that file if you use your own Firebase project.

### 4. Run

```bash
npm run dev --prefix server   # API and sockets on :5000
npm run dev                   # web app on :5173 (proxies /api and /socket.io to :5000)
```

Open <http://localhost:5173/login>. Use `localhost`, not `127.0.0.1`, so Firebase sign-in accepts the origin.

### Mock mode

With no Firebase config, the app falls back to a local mock mode: data lives in the browser, a "Bypass Login" button appears, and two tabs act as the two partners. It is meant for working on the UI without any accounts. It is off whenever a real Firebase config is present.

## Project structure

```
.
|-- src/                      React app
|   |-- components/           UI by feature (gallery, pinboard, memorystack, games, ...)
|   |-- pages/                Route pages
|   |-- services/             Firebase, Cloudinary, Socket.io and per-feature data access
|   '-- store/                Zustand stores (auth, socket, nudges, games)
|-- server/src/               Express API
|   |-- config/firebase.ts    Firebase Admin initialisation
|   |-- controllers/          Login handshake and pairing
|   |-- middlewares/          Firebase ID token verification
|   |-- routes/               /api/auth and /api/transfer (phone upload relay)
|   '-- sockets/              Authenticated realtime relay
|-- login-app/                Standalone prototype of a future sign-in flow (mock services only)
|-- firestore.rules           Security rules
|-- firestore.indexes.json    Composite indexes
'-- .github/workflows/        CI (typecheck and build)
```

## Security notes

- Firestore rules only allow a user to read and write documents whose `coupleId` matches their own profile, and writes must carry the author's own uid. The `users` and `couples` documents are written by the server only (partners may edit just the anniversary date).
- A username login is a Firebase email/password credential on a hidden, non-deliverable address (`username@ourspace.invalid`) linked to the same account as Google. The password goes straight to Firebase and never reaches the API, and usernames are unique because Firebase rejects a second account on the same address.
- A partner only ever sees your name, username and photo, never your email, gender or date of birth.
- The REST API and Socket.io both require a valid Firebase ID token. A development-only token is accepted when `NODE_ENV` is not `production`, and is refused in production.
- Phone upload sessions need a signed-in owner to create and collect; the phone itself only holds a long random link token. Sessions expire after 15 minutes and are capped by size and count.
- Cloudinary uploads are signed by the API for signed-in users (`/api/media/sign`), limited to image formats and one folder. If the Cloudinary keys aren't set on the server, the app falls back to an unsigned preset; once signing works, delete that preset or set it to "Signed" so the public upload path is closed.
- The API sends security headers (Helmet), allows one browser origin, throttles requests per IP, locks an account out for 15 minutes after five wrong invite codes, creates invite codes with a cryptographic random generator, and links a couple inside a database transaction so two simultaneous requests can't pair the same person twice.
- Firestore rules also reject link and picture fields that are not `http(s)` addresses or inline images, and keep an item's author and couple fixed after creation. The pages additionally refuse to render non-web links.
- See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Scripts

| Command | Where | What it does |
| --- | --- | --- |
| `npm run dev` | root | Start the Vite dev server |
| `npm run build` | root | Typecheck and build the web app |
| `npm run typecheck` | root, `server/` | Typecheck only |
| `npm run dev` | `server/` | Rebuild and restart the API on change |
| `npm run build` / `npm start` | `server/` | Compile and run the API |

## Roadmap

- Deployment configuration (hosting for the web app and API, API URL setting for split hosting)
- Voice notes stored outside Firestore
- Signed Cloudinary uploads through the API

## License

MIT, see [LICENSE](LICENSE).
