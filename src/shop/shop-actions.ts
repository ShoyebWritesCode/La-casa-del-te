'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { centsPerGramToEurPer10g } from '@/lib/money';

// ——— Types shared with the client ———

export type ShopCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type ShopProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** EUR per 10g (display-friendly) */
  price10g: number;
  /** Cents per gram (DB value, used for order calc) */
  priceCentsPerGram: number;
  currency: string;
  availableGrams: number[];
  recommendedGrams: number | null;
  categorySlug: string;
  categoryName: string;
  imageUrl: string | null;
};

export type ShopData = {
  categories: ShopCategory[];
  products: ShopProduct[];
};

// ——— Data fetching ———

export async function getShopData(): Promise<ShopData> {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, sortOrder: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
      include: {
        category: { select: { slug: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    }),
  ]);

  const shopProducts: ShopProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price10g: centsPerGramToEurPer10g(p.priceCentsPerGram),
    priceCentsPerGram: p.priceCentsPerGram,
    currency: p.currency,
    availableGrams: p.availableGrams,
    recommendedGrams: p.recommendedGrams,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    imageUrl: p.images[0]?.url ?? null,
  }));

  return { categories, products: shopProducts };
}

// ——— Coupon validation ———

export type CouponResult = {
  valid: boolean;
  percentOff: number;
  message: string;
};

export async function validateCoupon(code: string): Promise<CouponResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { valid: false, percentOff: 0, message: 'Enter a coupon code' };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: trimmed },
  });

  if (!coupon || !coupon.isActive) {
    return { valid: false, percentOff: 0, message: 'Invalid code' };
  }

  return {
    valid: true,
    percentOff: coupon.percentOff,
    message: `${coupon.percentOff}% discount applied!`,
  };
}

// ——— Order creation ———

type OrderItemInput = {
  productId: string;
  productName: string;
  priceCentsPerGram: number;
  grams: number;
  quantity: number;
};

export type OrderResult = {
  success: boolean;
  orderNumber: string;
  error?: string;
};

export async function createOrder(
  items: OrderItemInput[],
  couponCode?: string,
): Promise<OrderResult> {
  if (!items.length) {
    return { success: false, orderNumber: '', error: 'Cart is empty' };
  }

  // Compute line totals in cents
  const lineItems = items.map((item) => ({
    ...item,
    lineTotalCents: item.priceCentsPerGram * item.grams * item.quantity,
  }));

  const subtotalCents = lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0);

  // Coupon
  let discountPercent = 0;
  let resolvedCouponCode: string | null = null;

  if (couponCode) {
    const trimmed = couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: trimmed },
    });
    if (coupon && coupon.isActive) {
      discountPercent = coupon.percentOff;
      resolvedCouponCode = coupon.code;
    }
  }

  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  const totalCents = subtotalCents - discountCents;

  // Generate order number: ORD-YYYYMMDD-XXXXXX
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
  const orderNumber = `ORD-${datePart}-${randomPart}`;

  try {
    await prisma.order.create({
      data: {
        orderNumber,
        status: 'pending',
        couponCode: resolvedCouponCode,
        discountPercent,
        subtotalCents,
        discountCents,
        totalCents,
        currency: 'EUR',
        items: {
          create: lineItems.map((li) => ({
            productId: li.productId,
            productName: li.productName,
            unitPriceCentsPerGram: li.priceCentsPerGram,
            grams: li.grams,
            quantity: li.quantity,
            lineTotalCents: li.lineTotalCents,
          })),
        },
      },
    });

    revalidatePath('/admin/orders');

    return { success: true, orderNumber };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Order creation failed:', message, err);
    return {
      success: false,
      orderNumber: '',
      error: `Failed to create order: ${message}`,
    };
  }
}
