import Link from 'next/link';
import { adminLogin } from '@/lib/admin-auth-actions';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-body)] px-4 text-[var(--text-main)]">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card) p-8 shadow-lg">
        <h1 className="mb-6 font-serif text-2xl text-(--primary)">Admin login</h1>
        {!process.env.ADMIN_PASSWORD ? (
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
            Set <code className="rounded bg-black/10 px-1">ADMIN_PASSWORD</code> in your environment.
          </p>
        ) : null}
        {sp.error ? (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">Invalid password.</p>
        ) : null}
        <form action={adminLogin} className="flex flex-col gap-4">
          <label className="text-sm font-medium text-(--text-light)">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={!process.env.ADMIN_PASSWORD}
              className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 font-sans text-[var(--text-main)] outline-none focus:border-(--primary) disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={!process.env.ADMIN_PASSWORD}
            className="rounded-full bg-(--primary) px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-(--primary-light) disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-(--text-light)">
          <Link href="/" className="underline hover:text-(--primary)">
            Back to shop
          </Link>
        </p>
      </div>
    </div>
  );
}
