
'use server';

import { redirect } from 'next/navigation';

// Note: iron-session based login has been removed to fix deployment issues.
// A new authentication method (e.g., Firebase Auth) will be implemented.

export async function loginAction(
  prevState: { message: string | null },
  formData: FormData
): Promise<{ message: string | null }> {
  // This is a placeholder and won't be called by the disabled form.
  redirect('/admin');
}

export async function logoutAction() {
  // This is a placeholder. The actual logout logic will depend on the new auth system.
  redirect('/admin/login');
}
