
'use server';

import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';

export async function loginAction(
  prevState: { message: string | null },
  formData: FormData
): Promise<{ message: string | null }> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  // In a real application, you would look up the user in a database
  // and check their hashed password.
  if (username === 'admin' && password === 'admin') {
    session.isLoggedIn = true;
    await session.save();
    redirect('/admin');
  }

  return { message: 'Invalid username or password.' };
}

export async function logoutAction() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.destroy();
  redirect('/admin/login');
}
