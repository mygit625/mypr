'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// This is a placeholder for a real authentication system.
// In a production app, use a proper auth provider like Firebase Auth.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

export async function loginAction(
  prevState: { message: string | null },
  formData: FormData
): Promise<{ message: string | null }> {
  const username = formData.get('username');
  const password = formData.get('password');

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Set a simple cookie to simulate a session
    cookies().set('admin_logged_in', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    return { message: 'Success' };
  }

  return { message: 'Invalid username or password.' };
}

export async function logoutAction() {
  // Clear the session cookie
  cookies().set('admin_logged_in', '', { expires: new Date(0) });
  redirect('/admin/login');
}
