import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { ProductForm } from '../product-form';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  if (!product) notFound();

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/products" className="text-sm text-(--primary) underline">
          ← Products
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-(--primary)">Edit product</h1>
      </div>
      <ProductForm categories={categories} product={product} />
    </div>
  );
}
