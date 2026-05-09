import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { formatEurFromCents } from '@/lib/format';

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: true },
  });

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-(--primary)">Orders</h1>
      <p className="mb-6 text-sm text-(--text-light)">Latest 100 orders.</p>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card)">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--border-subtle)] text-(--text-light)">
            <tr>
              <th className="px-4 py-3 font-medium">Order #</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-(--text-light)">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3">{formatEurFromCents(o.totalCents)}</td>
                  <td className="px-4 py-3 text-(--text-light)">{o.items.length}</td>
                  <td className="px-4 py-3 text-(--text-light)">
                    {o.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="text-(--primary) underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
