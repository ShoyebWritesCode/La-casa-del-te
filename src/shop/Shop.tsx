'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArrowLeft,
  FaCertificate,
  FaLeaf,
  FaMoon,
  FaMugHot,
  FaPlus,
  FaShoppingBag,
  FaSun,
  FaTimes,
} from 'react-icons/fa';
import type { ShopCategory, ShopProduct } from './shop-actions';
import { validateCoupon, createOrder } from './shop-actions';

const blogData: Record<string, { title: string; text: string }> = {
  tutti: {
    title: 'The Collection',
    text: 'A curated selection of fine varieties, from the mountains of China to Mediterranean herbal traditions.',
  },
  energia: {
    title: 'Qi Awakening',
    text: 'Bold black teas and adaptogenic roots to restore vitality and mental focus.',
  },
  relax: {
    title: 'Calm Ritual',
    text: 'Delicate floral blends to ease tension and guide you toward restful sleep.',
  },
  digestione: {
    title: 'Lightness',
    text: 'Seeds and roots that help your body return to its natural balance after meals.',
  },
  detox: {
    title: 'Purity',
    text: "Nature's bright green to drain, purify, and brighten.",
  },
};

type CartItem = {
  cartId: string;
  id: string;
  name: string;
  weight: number;
  unitPrice: number;
  priceCentsPerGram: number;
  qty: number;
};

type ToastState = { visible: boolean; text: string };

const STORAGE_KEY = 'teaCart';
const THEME_KEY = 'teaTheme';
type Theme = 'light' | 'dark';

function euro(amount: number) {
  return `€${amount.toFixed(2)}`;
}

function priceForWeight(p: ShopProduct, weight: number) {
  return (p.price10g / 10) * weight;
}

function safeParseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as CartItem[];
  } catch {
    return [];
  }
}

export default function Shop({
  initialCategories,
  initialProducts,
}: {
  initialCategories: ShopCategory[];
  initialProducts: ShopProduct[];
}) {
  const [category, setCategory] = useState<string>('tutti');
  // Use stable defaults for SSR, then hydrate from localStorage after mount
  const [cart, setCart] = useState<CartItem[]>([]);
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  const [modalProduct, setModalProduct] = useState<ShopProduct | null>(null);
  const [modalWeight, setModalWeight] = useState<number>(50);

  const [discount, setDiscount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    text: 'Added to cart',
  });

  const [orderId, setOrderId] = useState<string>('#000000');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hydrate theme + cart from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    setCart(safeParseCart(localStorage.getItem(STORAGE_KEY)));
    setMounted(true);
  }, []);

  // Persist + apply theme
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme, mounted]);

  // Persist cart
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, mounted]);

  // Prevent background scrolling when overlays are open
  const anyOverlayOpen = Boolean(modalProduct) || isCartOpen || isCheckoutOpen || isQrOpen;
  useEffect(() => {
    if (!anyOverlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [anyOverlayOpen]);

  const products = useMemo(() => {
    if (category === 'tutti') return initialProducts;
    return initialProducts.filter((p) => p.categorySlug === category);
  }, [category, initialProducts]);

  const totalQty = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);
  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.unitPrice * item.qty, 0),
    [cart],
  );
  const finalTotal = useMemo(() => subtotal * (1 - discount), [subtotal, discount]);

  function openModal(p: ShopProduct) {
    setModalProduct(p);
    setModalWeight(p.recommendedGrams ?? p.availableGrams[0] ?? 50);
  }

  function closeModal() {
    setModalProduct(null);
  }

  function showToast(text: string) {
    setToast({ visible: true, text });
    window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }

  function addToCart(p: ShopProduct, weight: number) {
    const unitPrice = priceForWeight(p, weight);
    const cartId = `${p.id}-${weight}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.cartId === cartId);
      if (existing) {
        return prev.map((i) => (i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        { cartId, id: p.id, name: p.name, weight, unitPrice, priceCentsPerGram: p.priceCentsPerGram, qty: 1 },
      ];
    });
    showToast('Added to cart');
  }

  function removeFromCart(cartId: string) {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  }

  function openCheckout() {
    if (cart.length === 0) return;
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }

  function closeCheckout() {
    setIsCheckoutOpen(false);
    setDiscount(0);
    setCouponCode('');
    setCouponMsg(null);
  }

  async function applyCoupon() {
    const result = await validateCoupon(couponCode);
    if (result.valid) {
      setDiscount(result.percentOff / 100);
      setCouponMsg({ text: result.message, ok: true });
    } else {
      setDiscount(0);
      setCouponMsg({ text: result.message, ok: false });
    }
  }

  async function confirmOrder() {
    const orderItems = cart.map((item) => ({
      productId: item.id,
      productName: item.name,
      priceCentsPerGram: item.priceCentsPerGram,
      grams: item.weight,
      quantity: item.qty,
    }));

    const result = await createOrder(
      orderItems,
      discount > 0 ? couponCode.trim().toUpperCase() : undefined,
    );

    if (!result.success) {
      showToast(result.error ?? 'Order failed');
      return;
    }

    setOrderId(result.orderNumber);

    const orderData = { o: result.orderNumber, t: finalTotal.toFixed(2) };
    const jsonString = JSON.stringify(orderData);

    const mod = await import('qrious');
    const QRiousCtor = (mod as unknown as { default?: unknown }).default ?? (mod as unknown);

    if (typeof QRiousCtor === 'function' && qrCanvasRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (QRiousCtor as any)({
        element: qrCanvasRef.current,
        value: jsonString,
        size: 220,
        level: 'L',
        backgroundAlpha: 0,
        foreground: '#2D462E',
      });
    }

    setIsCheckoutOpen(false);
    setIsQrOpen(true);
    setCart([]);
  }

  const blog = blogData[category] ?? {
    title: initialCategories.find((c) => c.slug === category)?.name ?? 'Selection',
    text: 'Explore our curated selection of fine teas and herbal infusions.',
  };

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] pb-[110px]">
      {/* Header */}
      <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-[var(--border-subtle)] bg-(--bg-elevated) px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 font-serif text-[20px] font-semibold tracking-wide text-(--primary)">
          <FaLeaf />
          <span>LA CASA DEL TÈ</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="rounded-full p-2 text-[18px] text-(--primary) transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/30"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen((v) => !v)}
            className="relative rounded-full p-2 text-[20px] text-(--primary) transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/30"
            aria-label="Open cart"
          >
            <FaShoppingBag />
            {totalQty > 0 ? (
              <span className="absolute -top-1 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-(--bg-card) bg-(--accent) px-1 text-[10px] font-semibold text-white shadow-sm">
                {totalQty}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative mb-6 flex h-[34vh] min-h-[280px] items-center justify-center overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(45,70,46,0.25)] via-[rgba(45,70,46,0.7)] to-[rgba(45,70,46,0.92)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.35),transparent_45%),radial-gradient(circle_at_70%_65%,rgba(168,62,50,0.25),transparent_50%)]" />

        <div className="relative z-[2] px-5 text-center text-white">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] tracking-[3px] text-(--gold) shadow-[0_12px_40px_-20px_rgba(0,0,0,0.65)] backdrop-blur">
            EST. 2024
          </div>
          <h1 className="mb-2 font-serif text-[36px] italic leading-tight [text-shadow:0_10px_35px_rgba(0,0,0,0.45)] sm:text-[40px]">
            L&apos;Arte dell&apos;Infuso
          </h1>
            <p className="mx-auto max-w-[520px] text-[11px] font-light tracking-[2px] uppercase text-white/90 sm:text-[12px]">
              A sensory journey in every cup
            </p>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-[76px] z-[90] bg-linear-to-b from-(--bg-body) via-(--bg-body) to-transparent pt-2 pb-2">
        <div className="no-scrollbar mx-auto flex max-w-[1200px] gap-2 overflow-x-auto px-5 pb-2">
          {[{ slug: 'tutti', name: 'All' }, ...initialCategories.map((c) => ({ slug: c.slug, name: c.name }))].map(({ slug, name }) => {
            const active = category === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setCategory(slug)}
                className={[
                  'whitespace-nowrap rounded-full border px-4.5 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/30',
                  active
                    ? 'border-(--primary) bg-(--primary) text-white shadow-[0_10px_25px_-15px_rgba(45,70,46,0.55)]'
                    : 'border-[var(--border-subtle)] bg-(--bg-card)/90 text-(--text-main) hover:bg-(--bg-card) hover:shadow-sm',
                ].join(' ')}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Blog + Grid */}
      <div className="mx-auto w-full max-w-[1200px] px-4">
        <div className="mb-6 animate-[fadeSlideUp_0.6s_ease] text-center">
          <div className="mb-2 text-[10px] text-(--gold)">
            <FaCertificate className="inline-block" />
          </div>
          <h3 className="mb-2 font-serif text-[24px] text-(--primary) sm:text-[28px]">
            {blog.title}
          </h3>
          <p className="mx-auto max-w-[660px] text-[13px] leading-relaxed text-(--text-light) sm:text-[14px]">
            {blog.text}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => openModal(p)}
              className="group relative overflow-hidden rounded-[22px] border border-[var(--border-subtle)] bg-(--bg-card)/80 text-left shadow-(--shadow-card) transition hover:-translate-y-0.5 hover:shadow-[0_26px_85px_-44px_rgba(0,0,0,0.65)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/25"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/20 via-black/0 to-black/0 opacity-70 transition group-hover:opacity-60" />
                <Image
                  src={p.imageUrl || 'https://images.unsplash.com/photo-1564890369478-c59f2c0f27e8?auto=format&fit=crop&w=600&q=80'}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.07]"
                />
              </div>

              <div className="p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-(--gold)/20 bg-(--gold)/10 px-2.5 py-1 text-[9px] font-semibold tracking-[1px] uppercase text-(--gold)">
                    {p.categoryName}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-(--bg-body) px-2.5 py-1 text-[11px] font-semibold text-(--accent) shadow-sm">
                    {euro(p.price10g)} <span className="ml-1 text-(--text-light)">/10g</span>
                  </span>
                </div>

                <div className="mb-1 truncate font-serif text-[15px] font-semibold leading-tight text-(--text-main)">
                  {p.name}
                </div>
                <div className="text-[12px] text-(--text-light)">Tap for details and size</div>
              </div>

              <div className="absolute right-2.5 bottom-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-(--bg-card)/90 text-[12px] text-(--primary) shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)] backdrop-blur transition group-hover:scale-[1.06]">
                <FaPlus />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Product Modal Overlay */}
      <div
        className={[
          'fixed inset-0 z-[2000] bg-[rgba(45,70,46,0.4)] backdrop-blur-[4px] transition-opacity',
          modalProduct ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={closeModal}
      />

      {/* Product Bottom Sheet */}
      <div
        className={[
          // Mobile: bottom-sheet. Desktop: centered modal card.
          'fixed inset-x-0 bottom-0 z-[2001] flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[25px] bg-(--bg-card) shadow-[0_-10px_40px_rgba(0,0,0,0.25)] transition-transform duration-400 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] md:left-1/2 md:bottom-auto md:top-1/2 md:max-h-[80vh] md:max-w-[980px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px] md:shadow-[0_40px_120px_-60px_rgba(0,0,0,0.75)]',
          modalProduct ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Product details"
      >
        {modalProduct ? (
          <>
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-(--bg-card)/90 text-[16px] text-(--text-main) shadow-[0_10px_25px_-18px_rgba(0,0,0,0.65)] backdrop-blur transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/25"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <div className="flex min-h-0 flex-col md:flex-row">
              {/* Image: show full product (no crop) */}
              <div className="relative border-b border-(--border-subtle) bg-black/5 md:w-[44%] md:border-b-0 md:border-r">
                <div className="relative mx-auto aspect-[4/3] w-full max-w-[760px] p-4 md:aspect-[1/1.05] md:p-6">
                  <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.18),transparent_55%),radial-gradient(circle_at_70%_75%,rgba(168,62,50,0.12),transparent_55%)]" />
                  <div className="relative h-full w-full overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--bg-card)/70 shadow-[0_24px_80px_-52px_rgba(0,0,0,0.85)]">
                    <Image
                      src={modalProduct.imageUrl || 'https://images.unsplash.com/photo-1564890369478-c59f2c0f27e8?auto=format&fit=crop&w=600&q=80'}
                      alt={modalProduct.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 44vw"
                      unoptimized
                      className="object-contain p-3 md:p-5"
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 overflow-y-auto p-6 md:p-7">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center rounded-full border border-(--gold)/20 bg-(--gold)/10 px-2.5 py-1 text-[9px] font-semibold tracking-[1px] uppercase text-(--gold)">
                        {modalProduct.categoryName}
                      </span>
                      <h2 className="mt-2 font-serif text-[26px] leading-tight text-(--primary) md:text-[30px]">
                        {modalProduct.name}
                      </h2>
                    </div>
                  </div>

                  <p className="mb-6 text-[14px] leading-relaxed text-(--text-light)">
                    {modalProduct.description}
                  </p>

                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-[1px] uppercase text-(--text-light)">
                      Select size
                    </span>
                    {modalProduct.recommendedGrams ? (
                      <span className="text-[12px] font-medium text-(--text-light)">
                        Recommended: <b className="text-(--text-main)">{modalProduct.recommendedGrams}g</b>
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {(modalProduct.availableGrams.length > 0 ? modalProduct.availableGrams : [10, 20, 50, 100, 200]).map((w) => {
                      const selected = w === modalWeight;
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setModalWeight(w)}
                          className={[
                            'rounded-xl border py-3 text-center text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/25',
                            selected
                              ? 'border-(--primary) bg-[rgba(45,70,46,0.16)] font-semibold text-(--primary)'
                              : 'border-(--border-subtle) bg-black/5 text-(--text-main) hover:bg-black/8',
                          ].join(' ')}
                        >
                          {w}g
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="flex items-center justify-between gap-4 border-t border-(--border-subtle) bg-(--bg-card) px-6 py-5 md:px-7">
                  <div>
                    <div className="text-[11px] font-semibold tracking-[1px] uppercase text-(--text-light)">
                      Price
                    </div>
                    <div className="font-serif text-[26px] font-bold text-(--accent)">
                      {euro(priceForWeight(modalProduct, modalWeight))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      addToCart(modalProduct, modalWeight);
                      closeModal();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-(--primary) px-7 py-3.5 text-[13px] font-semibold tracking-[1px] uppercase text-white shadow-[0_18px_40px_-25px_rgba(45,70,46,0.8)] transition hover:bg-(--primary-light) hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/30"
                  >
                    Add <FaPlus className="text-[12px]" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Cart Overlay */}
      <div
        className={[
          'fixed inset-0 z-[2999] bg-[rgba(45,70,46,0.4)] backdrop-blur-[4px] transition-opacity',
          isCartOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Drawer */}
      <aside
        className={[
          'fixed inset-0 left-auto z-[3000] flex w-full max-w-[420px] flex-col bg-(--bg-card) shadow-[-10px_0_40px_rgba(0,0,0,0.25)] transition-transform',
          isCartOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label="Cart"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-5 font-serif text-[20px] text-[var(--primary)]">
          <span>Your Cart</span>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="text-[18px] text-[var(--text-light)]"
            aria-label="Close cart"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <p className="mt-10 text-center text-zinc-400">
              Your cart is empty.
              <br />
              Fill your cup!
            </p>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartId}
                className="mb-5 flex items-start justify-between border-b border-dashed border-[var(--border-subtle)] pb-5"
              >
                <div>
                  <h4 className="mb-1 font-serif text-[16px]">
                    {item.name}
                  </h4>
                  <div className="text-[12px] text-[var(--text-light)]">
                    {item.weight}g pack
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-[var(--text-main)]">
                    {euro(item.unitPrice)} x {item.qty}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[16px] font-semibold">
                    {euro(item.unitPrice * item.qty)}
                  </div>
                  <button
                    type="button"
                    className="mt-1 text-[12px] text-zinc-400 hover:text-[var(--accent)] hover:underline"
                    onClick={() => removeFromCart(item.cartId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-black/5 p-6">
          <div className="mb-5 flex items-center justify-between font-serif text-[18px] font-medium">
            <span>Total</span>
            <span>{euro(subtotal)}</span>
          </div>
          <button
            type="button"
            onClick={openCheckout}
            className="w-full rounded-full bg-[var(--primary)] px-7 py-3.5 text-[13px] font-medium tracking-[1px] uppercase text-white transition hover:bg-[var(--primary-light)]"
          >
            Proceed to checkout
          </button>
        </div>
      </aside>

      {/* Checkout Fullscreen */}
      <div
        className={[
          'fixed inset-0 z-[4000] flex flex-col bg-(--bg-body) transition',
          isCheckoutOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-label="Checkout"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-(--bg-card) px-5 py-5 font-serif text-[20px] text-[var(--primary)]">
          <button
            type="button"
            onClick={closeCheckout}
            className="text-[18px]"
            aria-label="Back"
          >
            <FaArrowLeft />
          </button>
          <span>Order Summary</span>
          <div className="w-5" />
        </div>

        <div className="flex-1 overflow-y-auto bg-black/5 p-6">
          <div className="mb-5 rounded-xl bg-(--bg-card) p-5 shadow-[0_16px_45px_-36px_rgba(0,0,0,0.55)]">
            <h4 className="mb-4 font-serif">Items</h4>

            {cart.map((item) => (
              <div key={item.cartId} className="mb-3 flex justify-between text-[14px]">
                <span className="text-(--text-main)">
                  {item.name} ({item.weight}g) x {item.qty}
                </span>
                <span className="font-medium text-(--text-main)">
                  {euro(item.unitPrice * item.qty)}
                </span>
              </div>
            ))}

            {discount > 0 ? (
              <div className="flex justify-between text-[14px] font-semibold text-[var(--accent)]">
                <span>Discount applied</span>
                <span>- {euro(subtotal * discount)}</span>
              </div>
            ) : null}

            <div className="mt-4 flex justify-between border-t border-dashed border-(--border-subtle) pt-4 font-serif text-[20px] text-(--primary)">
              <span>Total due</span>
              <span>{euro(finalTotal)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-(--bg-card) p-5 shadow-[0_16px_45px_-36px_rgba(0,0,0,0.55)]">
            <span className="mb-2 block text-[11px] font-semibold tracking-[1px] uppercase text-[var(--text-light)]">
              Have a discount code?
            </span>
            <div className="flex gap-2.5">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-3 font-sans outline-none focus:border-[var(--primary)] focus:bg-(--bg-card)"
                placeholder="e.g. TEALOVERS"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-[13px] font-medium tracking-[1px] uppercase text-white"
              >
                Apply
              </button>
            </div>

            <div
              className="mt-2 min-h-[18px] text-[12px] font-medium"
              style={{
                color: couponMsg ? (couponMsg.ok ? 'var(--primary)' : 'var(--accent)') : undefined,
              }}
            >
              {couponMsg?.text ?? ''}
            </div>
          </div>

          <button
            type="button"
            onClick={confirmOrder}
            className="mt-5 w-full rounded-full bg-[var(--primary)] px-7 py-4.5 text-[16px] font-medium tracking-[1px] uppercase text-white"
          >
            Confirm & Pay
          </button>
        </div>
      </div>

      {/* QR View */}
      <div
        className={[
          'fixed inset-0 z-[5000] flex flex-col items-center justify-center bg-[var(--primary)] px-10 text-center text-white transition',
          isQrOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-label="Order QR"
      >
        <FaMugHot className="mb-5 text-[50px] text-white/80" />
        <h2 className="font-serif text-[32px]">Order Confirmed</h2>
        <p className="mb-7 font-light opacity-80">Show this code at checkout</p>

        <div className="my-7 rounded-[20px] bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <canvas ref={qrCanvasRef} width={220} height={220} />
        </div>

        <p className="text-[11px] tracking-[1px] uppercase">Order Code</p>
        <div className="mt-3 rounded-full border border-white/20 bg-white/10 px-4 py-1 font-mono tracking-[2px]">
          {orderId}
        </div>

        <button
          type="button"
          onClick={() => {
            setIsQrOpen(false);
            setDiscount(0);
            setCouponCode('');
            setCouponMsg(null);
            showToast('Back to shop');
          }}
          className="mt-12 cursor-pointer rounded-full bg-white px-7 py-3 font-semibold text-[var(--primary)]"
        >
          Back to Shop
        </button>
      </div>

      {/* Toast */}
      <div
        className={[
          'pointer-events-none fixed bottom-7 left-1/2 z-[6000] -translate-x-1/2 rounded-full bg-black/90 px-6 py-3 text-[13px] font-medium text-white shadow-[0_18px_45px_-25px_rgba(0,0,0,0.75)] backdrop-blur transition',
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        ].join(' ')}
      >
        {toast.text}
      </div>
    </div>
  );
}

