/** Convert admin-entered price in EUR per 10 grams to integer cents per gram (Prisma field). */
export function eurPer10gToCentsPerGram(eurPer10g: number) {
  if (!Number.isFinite(eurPer10g) || eurPer10g < 0) return 0;
  return Math.max(0, Math.round((eurPer10g / 10) * 100));
}

/** Display cents per gram as EUR per 10g for forms. */
export function centsPerGramToEurPer10g(centsPerGram: number) {
  return (centsPerGram * 10) / 100;
}
