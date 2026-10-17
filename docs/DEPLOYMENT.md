# Deploying OurSpace

OurSpace has two parts that live in different places:

| Part | Hosted on | Why |
| --- | --- | --- |
| **Website** (the React app in the repository root) | **Vercel** | A static site; Vercel builds it straight from GitHub |
| **API** (`server/`, Express and Socket.io) | **Render** | It keeps WebSocket connections open for live notes and games, which serverless hosting can't do |
| Accounts and data | Firebase (already set up) | Authentication and Firestore |
| Photos | Cloudinary (already set up) | Image storage |

Do the steps in this order: **API first** (you need its address for the website), then the website, then connect the two.

## Before you start

- The repository is on GitHub and `main` is up to date.
- Firebase is set up: Google and Email/Password sign-in enabled, Firestore created, and the rules deployed (`npx firebase-tools deploy --only firestore`).
- You have your Firebase **service account** details (Firebase Console, Project settings, Service accounts, Generate new private key). Keep that JSON file private.
- Optional but recommended: your Cloudinary **API key** and **API secret** (Cloudinary dashboard, API Keys), so photo uploads are signed.

## 1. Deploy the API on Render

1. Go to <https://render.com> and sign in with GitHub.
2. Choose **New, then Blueprint**, pick this repository, and let Render read `render.yaml`.
   (Prefer to set it up by hand? Create a **Web Service** with: Root Directory `server`, Build Command `npm ci --include=dev && npm run build`, Start Command `npm start`, Health Check Path `/health`.)
3. Fill in the environment variables Render asks for:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (already set by the blueprint) |
| `CLIENT_URL` | Your website's address. You don't have it yet: put `https://placeholder.invalid` for now and change it in step 3 |
| `FIREBASE_PROJECT_ID` | `project_id` from the service account JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the JSON. Paste it as one line with `\n` between the lines, exactly as it appears in the file |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From Cloudinary (optional; without them uploads fall back to the unsigned preset) |

4. Deploy. When it finishes, open `https://<your-service>.onrender.com/health`. You should see `{"status":"healthy"}`.
5. Copy the service address (for example `https://ourspace-api.onrender.com`). You need it next.

> On Render's free plan the API goes to sleep after about 15 minutes without traffic, so the first request after a quiet spell can take 30 to 60 seconds. A paid instance stays awake.

## 2. Deploy the website on Vercel

1. Go to <https://vercel.com>, sign in with GitHub, and choose **Add New, then Project**.
2. Import the **OurSpace** repository.
3. Leave the settings as detected: Framework Preset **Vite**, Root Directory `./`, Build Command `npm run build`, Output Directory `dist`. (They are also pinned in `vercel.json`.)
4. Open **Environment Variables** and add these (Production, Preview and Development):

| Variable | Value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | From Firebase, Project settings, Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From the same screen |
| `VITE_FIREBASE_APP_ID` | From the same screen |
| `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Your unsigned preset name (needed until signed uploads are working) |
| `VITE_API_URL` | The Render address from step 1, with no trailing slash |

   Do **not** add `VITE_ENABLE_MOCK_AUTH`.
5. Click **Deploy**. Copy the website's address when it is ready (for example `https://ourspace.vercel.app`).

## 3. Connect the two

1. In Render, open the API service, Environment, and set **`CLIENT_URL`** to the website's address from step 2, with no trailing slash. To allow a custom domain as well, separate the addresses with a comma: `https://ourspace.vercel.app,https://www.yourdomain.com`. Save; Render redeploys.
2. In the **Firebase Console, Authentication, Settings, Authorized domains**, add the website's domain (`ourspace.vercel.app`, and any custom domain). Without this, Google sign-in fails with `auth/unauthorized-domain`.
3. If you restricted the Firebase web API key in Google Cloud Console (recommended), add the website's address to its allowed HTTP referrers (`https://ourspace.vercel.app/*`).

## 4. Check that it works

Open the website and go through this list:

- [ ] The page loads and a refresh on any page (for example `/gallery`) still works.
- [ ] **Continue with Google** opens the Google window and signs you in.
- [ ] The profile steps save, and you reach the pairing screen with your invite code.
- [ ] A second account can pair with that code.
- [ ] Adding a pin or a memory shows up for both partners.
- [ ] A photo uploads to the gallery, and "Use phone" shows a QR code that works from your phone.
- [ ] A note sent from one account appears on the other (this proves the live connection to the API).

If the API has been asleep, give the first request a minute.

## 5. After the first deploy

- **Photos:** once the Cloudinary keys are on Render, uploads are signed. Then delete the public `ourspace` upload preset in Cloudinary (or set it to Signed) so only signed-in people can upload, and remove `VITE_CLOUDINARY_UPLOAD_PRESET` from Vercel.
- **Updates:** every push to `main` redeploys both the website and the API automatically.
- **Changing a variable:** the website bakes `VITE_*` values in at build time, so after editing one in Vercel use **Redeploy**. Changing an API variable on Render redeploys it for you.
- **Preview deployments:** Vercel gives each branch its own address. They can't talk to the API unless that address is added to `CLIENT_URL`, so treat previews as visual-only, or add the preview address temporarily.

## Troubleshooting

| What you see | Likely cause and fix |
| --- | --- |
| Google sign-in says the domain is not authorized | Add the website's domain under Firebase, Authentication, Settings, Authorized domains |
| Browser console shows a CORS error, or sign-in loads forever | `CLIENT_URL` on Render doesn't exactly match the website's address (check `https`, the spelling, no trailing slash), or `VITE_API_URL` on Vercel is missing or wrong |
| Notes and games never arrive, the console shows `unauthorized` or a failed WebSocket | `VITE_API_URL` is empty (the site is talking to its own address), or the API is asleep or down. Open `<api>/health` |
| Render's build fails with `tsc: not found` | The build command must include `--include=dev` (it does in `render.yaml`) |
| Render logs say `Firebase Admin credentials missing` | One of the three `FIREBASE_*` values is empty, or the private key lost its `\n` line breaks |
| Render logs say `CLIENT_URL must be set` | Add `CLIENT_URL` |
| Photo uploads fail | Check the Cloudinary values on Render, or that the unsigned preset still exists if signed uploads aren't set up |
| Memories won't load right after the first deploy of the rules | Firestore is still building the index; wait a few minutes |

## Costs and limits (check each provider's current pricing)

- **Vercel Hobby:** free for personal projects, with bandwidth and build limits that a two-person app won't reach.
- **Render free web service:** free, sleeps when idle, and has a monthly hours allowance.
- **Firebase Spark plan:** free quotas for Authentication and Firestore reads and writes per day; ample for a couple.
- **Cloudinary free plan:** monthly storage and bandwidth credits, with a 10 MB limit per image.
