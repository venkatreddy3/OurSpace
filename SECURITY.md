# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private reporting instead:
**Security > Report a vulnerability** on this repository. Include what you found, how to reproduce it and what
it could allow. You will get a reply as soon as possible.

## How the app protects its data

- **Access control:** Firestore security rules limit every read and write to the two members of a couple. Users
  and couples are written only by the server. See `firestore.rules`.
- **Authentication:** the REST API and Socket.io require a valid Firebase ID token. Passwords are handled
  entirely by Firebase Authentication and are never sent to or stored by this app's server or database.
- **Abuse limits:** per-IP request throttling, an account lockout after repeated wrong invite codes, and size
  limits on request bodies and realtime messages.
- **Hardening:** security headers (Helmet), a single allowed browser origin (CORS), no framework fingerprint,
  and generic error messages in production.
- **Uploads:** photos are uploaded to Cloudinary with a signature issued by the server to signed-in users only,
  limited to image formats.

## Secrets

`.env` files and service-account keys must never be committed; they are listed in `.gitignore`. Rotate any key that
may have been exposed.
