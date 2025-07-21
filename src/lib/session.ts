import type { IronSessionOptions } from 'iron-session';

// Ensure a default secret is available for local development or if the env var is not set.
// In production, this should be overridden by the value in the Firebase console.
const password = process.env.SECRET_COOKIE_PASSWORD || 'complex_password_at_least_32_characters_long';

if (password.length < 32) {
  throw new Error('SECRET_COOKIE_PASSWORD must be at least 32 characters long.');
}

export const sessionOptions: IronSessionOptions = {
  password: password,
  cookieName: 'toolsinn-session',
  // secure: true should be used in production (HTTPS)
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export interface SessionData {
  isLoggedIn?: boolean;
}
