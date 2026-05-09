import Link from 'next/link';
import { adminLogout } from '@/lib/admin-auth-actions';

export const dynamic = 'force-dynamic';

const nav = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/orders', label: 'Orders' },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-body)] text-[var(--text-main)]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-(--bg-card) p-4">
        <Link href="/admin" className="mb-6 font-serif text-lg font-semibold text-(--primary)">
          Admin
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-(--text-main) hover:bg-black/5 dark:hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-8">
          <form action={adminLogout}>
            <button
              type="submit"
              className="text-sm text-(--text-light) underline hover:text-(--primary)"
            >
              Log out
            </button>
          </form>
          <Link href="/" className="mt-3 block text-sm text-(--text-light) underline hover:text-(--primary)">
            View shop
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
