import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { ProductForm } from '../product-form';

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/products" className="text-sm text-(--primary) underline">
          ← Products
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-(--primary)">New product</h1>
      </div>

      {categories.length === 0 ? (
        <p className="text-(--text-light)">
          Create a{' '}
          <Link href="/admin/categories" className="underline text-(--primary)">
            category
          </Link>{' '}
          first.
        </p>
      ) : (
        <ProductForm categories={categories} />
      )}
    </div>
  );
}
