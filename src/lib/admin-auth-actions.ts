'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, adminCookieValue } from '@/lib/admin-session';

export async function adminLogin(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    redirect('/admin/login?error=1');
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect('/admin');
}

export async function adminLogout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}
