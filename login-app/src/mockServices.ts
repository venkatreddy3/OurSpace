import type { AuthServices, SessionUser } from './types';

/** The code the mock "emails" out. Shown in a dev banner by the harness. */
export const MOCK_CODE = '123456';

const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));
const TAKEN = ['admin', 'ourspace', 'test', 'karan'];

// Accounts created during this page load, so the "returning user" login can be tried too
const accounts = new Map<string, { password: string; user: SessionUser }>();

/** In-memory stand-ins for Google, email and the backend, for designing the flow */
export const mockServices: AuthServices = {
  googleSignIn: async () => {
    await wait(900);
    return { profile: { email: 'you@gmail.com', name: 'Alex Morgan' }, existing: null };
  },
  sendCode: async () => {
    await wait();
  },
  verifyCode: async (_email, code) => {
    await wait(500);
    return code === MOCK_CODE;
  },
  checkUsername: async (username) => {
    await wait(350);
    return !TAKEN.includes(username) && !accounts.has(username);
  },
  createAccount: async (a) => {
    await wait(900);
    const user = { name: a.name, email: a.email, username: a.username };
    accounts.set(a.username, { password: a.password, user });
    return user;
  },
  loginWithPassword: async (username, password) => {
    await wait(700);
    const found = accounts.get(username.toLowerCase());
    if (!found || found.password !== password) throw new Error('Wrong username or password.');
    return found.user;
  },
};
