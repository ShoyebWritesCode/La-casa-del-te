import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { formatEurFromCents } from '@/lib/format';
import { centsPerGramToEurPer10g } from '@/lib/money';
import { updateOrderStatus } from '../../actions';

const statusOptions: OrderStatus[] = [
  'draft',
  'pending',
  'paid',
  'cancelled',
  'refunded',
];

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  });

  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-(--primary) underline">
        ← Orders
      </Link>
      <h1 className="mt-2 font-serif text-3xl text-(--primary)">Order {order.orderNumber}</h1>
      <p className="mt-1 text-sm text-(--text-light)">
        {order.createdAt.toISOString().slice(0, 19).replace('T', ' ')} UTC
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card) p-4">
        <form action={updateOrderStatus} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={order.id} />
          <label className="text-sm text-(--text-light)">
            Status
            <select
              name="status"
              defaultValue={order.status}
              className="mt-1 block rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 text-(--text-main)"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-full bg-(--primary) px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-light)"
          >
            Update status
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card) p-4">
          <h2 className="mb-3 font-serif text-lg text-(--primary)">Totals</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-(--text-light)">Subtotal</dt>
              <dd>{formatEurFromCents(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--text-light)">Discount</dt>
              <dd>
                {order.discountCents > 0 ? `−${formatEurFromCents(order.discountCents)}` : '—'}
                {order.couponCode ? ` (${order.couponCode}, ${order.discountPercent}%)` : ''}
              </dd>
            </div>
            <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2 font-semibold">
              <dt>Total</dt>
              <dd>{formatEurFromCents(order.totalCents)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <h2 className="mb-4 mt-10 font-serif text-xl text-(--primary)">Line items</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card)">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--border-subtle)] text-(--text-light)">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">g × qty</th>
              <th className="px-4 py-3 font-medium">€ / 10g at sale</th>
              <th className="px-4 py-3 font-medium">Line</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((line) => (
              <tr key={line.id} className="border-b border-[var(--border-subtle)] last:border-0">
                <td className="px-4 py-3">{line.productName}</td>
                <td className="px-4 py-3">
                  {line.grams}g × {line.quantity}
                </td>
                <td className="px-4 py-3">
                  {centsPerGramToEurPer10g(line.unitPriceCentsPerGram).toFixed(2)} {order.currency}
                </td>
                <td className="px-4 py-3">{formatEurFromCents(line.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
