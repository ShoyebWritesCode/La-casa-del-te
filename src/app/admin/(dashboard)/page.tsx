import Link from 'next/link';
import { prisma } from '@/db/prisma';

export default async function AdminHomePage() {
  let productCount: number | null = null;
  let categoryCount: number | null = null;
  let orderCount: number | null = null;
  let couponCount: number | null = null;
  let dbError: string | null = null;

  try {
    [productCount, categoryCount, orderCount, couponCount] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.order.count(),
      prisma.coupon.count(),
    ]);
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Unknown database error';
  }

  const cards = [
    { label: 'Products', count: productCount, href: '/admin/products' },
    { label: 'Categories', count: categoryCount, href: '/admin/categories' },
    { label: 'Orders', count: orderCount, href: '/admin/orders' },
    { label: 'Coupons', count: couponCount, href: '/admin/coupons' },
  ];

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-(--primary)">Dashboard</h1>
      <p className="mb-8 text-(--text-light)">Manage catalog, orders, and promotions.</p>

      {dbError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-medium">Database connection error</div>
          <div className="mt-1 wrap-break-word opacity-80">{dbError}</div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-(--border-subtle) bg-(--bg-card) p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="text-sm font-medium text-(--text-light)">{c.label}</div>
            <div className="mt-2 font-serif text-3xl text-(--primary)">{c.count ?? '—'}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
