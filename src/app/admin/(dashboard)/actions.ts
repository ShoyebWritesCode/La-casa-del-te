'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { eurPer10gToCentsPerGram } from '@/lib/money';
import { slugify } from '@/lib/slug';

function adminRevalidate() {
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidatePath('/admin/categories');
  revalidatePath('/admin/coupons');
  revalidatePath('/admin/orders');
}

// ——— Categories ———

export async function createCategory(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  let slug = String(formData.get('slug') ?? '').trim();
  const sortOrder = Number(formData.get('sortOrder') ?? 0) || 0;
  if (!name) return;
  if (!slug) slug = slugify(name);
  await prisma.category.create({
    data: { name, slug, sortOrder },
  });
  adminRevalidate();
}

export async function updateCategory(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  let slug = String(formData.get('slug') ?? '').trim();
  const sortOrder = Number(formData.get('sortOrder') ?? 0) || 0;
  const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';
  if (!id || !name) return;
  if (!slug) slug = slugify(name);
  await prisma.category.update({
    where: { id },
    data: { name, slug, sortOrder, isActive },
  });
  adminRevalidate();
}

export async function deleteCategory(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    redirect('/admin/categories?error=has_products');
  }
  await prisma.category.delete({ where: { id } });
  adminRevalidate();
}

// ——— Products ———

export async function createProduct(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  let slug = String(formData.get('slug') ?? '').trim();
  const categoryId = String(formData.get('categoryId') ?? '');
  const description = String(formData.get('description') ?? '');
  const priceEurPer10g = Number(formData.get('priceEurPer10g') ?? 0);
  
  const availableGramsRaw = String(formData.get('availableGrams') ?? '');
  const availableGrams = availableGramsRaw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
  
  const recommendedGramsRaw = formData.get('recommendedGrams');
  const recommendedGrams =
    recommendedGramsRaw && String(recommendedGramsRaw).trim() !== ''
      ? parseInt(String(recommendedGramsRaw), 10)
      : null;

  const currency = String(formData.get('currency') ?? 'EUR') || 'EUR';
  const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

  if (!name || !categoryId) return;
  if (!slug) slug = slugify(name);

  const priceCentsPerGram = eurPer10gToCentsPerGram(priceEurPer10g);
  const imagesRaw = String(formData.get('imageUrls') ?? '');
  const urls = imagesRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.product.create({
    data: {
      name,
      slug,
      categoryId,
      description,
      priceCentsPerGram,
      availableGrams,
      recommendedGrams,
      currency,
      isActive,
      images:
        urls.length > 0
          ? {
              create: urls.map((url, i) => ({
                url,
                alt: name,
                sortOrder: i,
              })),
            }
          : undefined,
    },
  });
  adminRevalidate();
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  let slug = String(formData.get('slug') ?? '').trim();
  const categoryId = String(formData.get('categoryId') ?? '');
  const description = String(formData.get('description') ?? '');
  const priceEurPer10g = Number(formData.get('priceEurPer10g') ?? 0);
  
  const availableGramsRaw = String(formData.get('availableGrams') ?? '');
  const availableGrams = availableGramsRaw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
  
  const recommendedGramsRaw = formData.get('recommendedGrams');
  const recommendedGrams =
    recommendedGramsRaw && String(recommendedGramsRaw).trim() !== ''
      ? parseInt(String(recommendedGramsRaw), 10)
      : null;

  const currency = String(formData.get('currency') ?? 'EUR') || 'EUR';
  const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

  if (!id || !name || !categoryId) return;
  if (!slug) slug = slugify(name);

  const priceCentsPerGram = eurPer10gToCentsPerGram(priceEurPer10g);
  const imagesRaw = String(formData.get('imageUrls') ?? '');
  const urls = imagesRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.product.update({
      where: { id },
      data: {
        name,
        slug,
        categoryId,
        description,
        priceCentsPerGram,
        availableGrams,
        recommendedGrams,
        currency,
        isActive,
      },
    });
    if (urls.length > 0) {
      await tx.productImage.createMany({
        data: urls.map((url, i) => ({
          productId: id,
          url,
          alt: name,
          sortOrder: i,
        })),
      });
    }
  });
  adminRevalidate();
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.product.delete({ where: { id } });
  adminRevalidate();
}

// ——— Coupons ———

export async function createCoupon(formData: FormData) {
  const code = String(formData.get('code') ?? '')
    .trim()
    .toUpperCase();
  const percentOff = Math.min(100, Math.max(0, Math.floor(Number(formData.get('percentOff') ?? 0))));
  const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';
  if (!code) return;
  await prisma.coupon.create({
    data: { code, percentOff, isActive },
  });
  adminRevalidate();
}

export async function updateCoupon(formData: FormData) {
  const code = String(formData.get('code') ?? '').trim();
  const percentOff = Math.min(100, Math.max(0, Math.floor(Number(formData.get('percentOff') ?? 0))));
  const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';
  if (!code) return;

  await prisma.coupon.update({
    where: { code },
    data: { percentOff, isActive },
  });
  adminRevalidate();
}

export async function deleteCoupon(formData: FormData) {
  const code = String(formData.get('code') ?? '').trim();
  if (!code) return;
  await prisma.coupon.delete({ where: { code } });
  adminRevalidate();
}

// ——— Orders ———

export async function updateOrderStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as OrderStatus;
  if (!id || !Object.values(OrderStatus).includes(status)) return;
  await prisma.order.update({
    where: { id },
    data: { status },
  });
  adminRevalidate();
}
