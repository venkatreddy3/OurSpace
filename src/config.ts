/**
 * Where the backend (REST API and Socket.io) lives.
 *
 * - Local development: leave VITE_API_URL unset. The Vite dev server forwards /api and /socket.io to localhost:5000.
 * - Deployed with the website and API on different hosts (for example the site on Vercel and the API on Render):
 *   set VITE_API_URL to the API's address, such as https://ourspace-api.onrender.com (no trailing slash).
 *   The API must then allow that website's address in its CLIENT_URL setting.
 */
export const API_URL: string = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim().replace(/\/+$/, '');

/** Base path for REST calls, e.g. `${API_BASE}/auth/me` */
export const API_BASE = `${API_URL}/api`;
