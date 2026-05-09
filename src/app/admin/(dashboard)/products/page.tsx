import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { centsPerGramToEurPer10g } from '@/lib/money';
import { deleteProduct } from '../actions';

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { category: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-(--primary)">Products</h1>
          <p className="text-sm text-(--text-light)">Prices stored as € / 10g in the shop API; DB uses cents per gram.</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center rounded-full bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-light)"
        >
          Add product
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card)">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--border-subtle)] text-(--text-light)">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">€ / 10g</th>
              <th className="px-4 py-3 font-medium">Sizes (g)</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-(--text-light)">
                  No products yet.{' '}
                  <Link href="/admin/products/new" className="underline text-(--primary)">
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-(--text-main)">{p.name}</div>
                    <div className="text-xs text-(--text-light)">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-(--text-light)">{p.category.name}</td>
                  <td className="px-4 py-3">
                    {centsPerGramToEurPer10g(p.priceCentsPerGram).toFixed(2)} {p.currency}
                  </td>
                  <td className="px-4 py-3">
                    {p.availableGrams.length > 0 ? p.availableGrams.join(', ') + 'g' : 'None'}
                    {p.recommendedGrams && (
                      <div className="text-[10px] font-bold text-(--primary)">Rec: {p.recommendedGrams}g</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="mr-3 text-(--primary) underline hover:no-underline"
                    >
                      Edit
                    </Link>
                    <form action={deleteProduct} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="text-red-600 underline hover:no-underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </form>
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
