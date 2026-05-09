import { prisma } from '@/db/prisma';
import { createCoupon, deleteCoupon, updateCoupon } from '../actions';

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { code: 'asc' },
  });

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-(--primary)">Coupons</h1>
      <p className="mb-6 text-sm text-(--text-light)">Percent discounts (0–100). Code is uppercase.</p>

      <section className="mb-10 rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card) p-6">
        <h2 className="mb-4 font-serif text-xl text-(--primary)">New coupon</h2>
        <form action={createCoupon} className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-(--text-light)">
            Code
            <input
              name="code"
              required
              className="mt-1 block rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 font-mono uppercase text-(--text-main)"
            />
          </label>
          <label className="text-sm text-(--text-light)">
            % off
            <input
              name="percentOff"
              type="number"
              min={0}
              max={100}
              required
              className="mt-1 block w-24 rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 text-(--text-main)"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-(--text-main)">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
          <button
            type="submit"
            className="rounded-full bg-(--primary) px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-light)"
          >
            Create
          </button>
        </form>
      </section>

      <div className="space-y-4">
        {coupons.map((c) => (
          <div
            key={c.code}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-(--bg-card) p-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <form action={updateCoupon} className="flex flex-1 flex-wrap items-end gap-3">
              <input type="hidden" name="code" value={c.code} />
              <div className="text-sm text-(--text-light)">
                Code
                <div className="mt-1 font-mono text-base font-semibold text-(--text-main)">{c.code}</div>
              </div>
              <label className="text-sm text-(--text-light)">
                % off
                <input
                  name="percentOff"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={c.percentOff}
                  required
                  className="mt-1 block w-24 rounded-lg border border-[var(--border-subtle)] bg-black/5 px-3 py-2 text-(--text-main)"
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
            <form action={deleteCoupon}>
              <input type="hidden" name="code" value={c.code} />
              <button type="submit" className="text-sm text-red-600 underline dark:text-red-400">
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
