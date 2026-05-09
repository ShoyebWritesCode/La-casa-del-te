import { prisma } from '@/db/prisma';
import { createCategory, deleteCategory, updateCategory } from '../actions';

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-(--primary)">Categories</h1>
      <p className="mb-6 text-sm text-(--text-light)">Group products. Slug must be unique.</p>

      {sp.error === 'has_products' ? (
        <p className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          Cannot delete a category that still has products. Reassign or delete those products first.
        </p>
      ) : null}

      <section className="mb-10 rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card) p-6">
        <h2 className="mb-4 font-serif text-xl text-(--primary)">Add category</h2>
        <form action={createCategory} className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-(--text-light)">
            Name
            <input
              name="name"
              required
              className="mt-1 block rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 text-(--text-main)"
            />
          </label>
          <label className="text-sm text-(--text-light)">
            Slug (optional)
            <input
              name="slug"
              className="mt-1 block rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 font-mono text-sm text-(--text-main)"
            />
          </label>
          <label className="text-sm text-(--text-light)">
            Sort order
            <input
              name="sortOrder"
              type="number"
              defaultValue={0}
              className="mt-1 block w-24 rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 text-(--text-main)"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-(--primary) px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-light)"
          >
            Add
          </button>
        </form>
      </section>

      <div className="space-y-4">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card) p-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <form action={updateCategory} className="flex flex-1 flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={c.id} />
              <label className="text-sm text-(--text-light)">
                Name
                <input
                  name="name"
                  defaultValue={c.name}
                  required
                  className="mt-1 block min-w-[160px] rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 text-(--text-main)"
                />
              </label>
              <label className="text-sm text-(--text-light)">
                Slug
                <input
                  name="slug"
                  defaultValue={c.slug}
                  required
                  className="mt-1 block min-w-[140px] rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 font-mono text-sm text-(--text-main)"
                />
              </label>
              <label className="text-sm text-(--text-light)">
                Sort
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={c.sortOrder}
                  className="mt-1 block w-20 rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 text-(--text-main)"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-(--text-main)">
                <input type="checkbox" name="isActive" defaultChecked={c.isActive} />
                Active
              </label>
              <button
                type="submit"
                className="rounded-full bg-(--primary) px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-light)"
              >
                Save
              </button>
            </form>
            <div className="flex shrink-0 items-center gap-4 border-t border-[var(--border-subtle)] pt-4 sm:border-t-0 sm:pt-0">
              <span className="text-sm text-(--text-light)">{c._count.products} products</span>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="text-sm text-red-600 underline dark:text-red-400"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
