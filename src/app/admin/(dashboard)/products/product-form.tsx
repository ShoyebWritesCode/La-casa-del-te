import type { Category, Product, ProductImage } from '@prisma/client';
import { centsPerGramToEurPer10g } from '@/lib/money';
import { createProduct, updateProduct } from '../actions';

type ProductWithImages = Product & { images: ProductImage[] };

export function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: ProductWithImages;
}) {
  const isEdit = Boolean(product);
  const action = isEdit ? updateProduct : createProduct;
  const imageUrls = product?.images?.map((i) => i.url).join('\n') ?? '';
  const priceField = product
    ? centsPerGramToEurPer10g(product.priceCentsPerGram).toFixed(2)
    : '';

  const availableGramsValue = product?.availableGrams?.join(', ') ?? '';

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-6">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <label className="block text-sm font-medium text-(--text-light)">
        Name *
        <input
          name="name"
          required
          defaultValue={product?.name}
          className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 text-(--text-main) outline-none focus:border-(--primary)"
        />
      </label>

      <label className="block text-sm font-medium text-(--text-light)">
        Slug (optional, generated from name if empty)
        <input
          name="slug"
          defaultValue={product?.slug}
          className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 font-mono text-sm text-(--text-main) outline-none focus:border-(--primary)"
        />
      </label>

      <label className="block text-sm font-medium text-(--text-light)">
        Category *
        <select
          name="categoryId"
          required
          defaultValue={product?.categoryId}
          className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 text-(--text-main) outline-none focus:border-(--primary)"
        >
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-(--text-light)">
        Description
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description}
          className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 text-(--text-main) outline-none focus:border-(--primary)"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-(--text-light)">
          Price (EUR per 10g) *
          <input
            name="priceEurPer10g"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={priceField}
            className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 text-(--text-main) outline-none focus:border-(--primary)"
          />
        </label>
        <label className="block text-sm font-medium text-(--text-light)">
          Currency
          <input
            name="currency"
            defaultValue={product?.currency ?? 'EUR'}
            className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 uppercase text-(--text-main) outline-none focus:border-(--primary)"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-(--text-light)">
          Available sizes (grams, comma-separated)
          <input
            name="availableGrams"
            placeholder="10, 20, 50"
            defaultValue={availableGramsValue}
            className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 text-(--text-main) outline-none focus:border-(--primary)"
          />
        </label>
        <label className="block text-sm font-medium text-(--text-light)">
          Recommended size (grams)
          <input
            name="recommendedGrams"
            type="number"
            min="0"
            step="1"
            defaultValue={product?.recommendedGrams ?? ''}
            className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 text-(--text-main) outline-none focus:border-(--primary)"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-(--text-light)">
        Image URLs (one per line)
        <textarea
          name="imageUrls"
          rows={4}
          placeholder="https://…"
          defaultValue={imageUrls}
          className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2.5 font-mono text-xs text-(--text-main) outline-none focus:border-(--primary)"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-(--text-main)">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={product?.isActive ?? true}
          className="rounded border-[var(--border-subtle)]"
        />
        Active
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-full bg-(--primary) px-6 py-3 text-sm font-semibold text-white hover:bg-(--primary-light)"
        >
          {isEdit ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  );
}
