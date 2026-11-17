// Official prices used for the rough cost line in the AI usage panel. Only per-picture prices the provider states
// directly are here; a model without one shows no cost. Text requests are priced by tokens, which this app does not
// count, so they show no cost either.

/**
 * Price per 1K picture in US dollars.
 * Source: https://aistudio.google.com/docs/pricing (checked 2026-11-17):
 * "Equivalent to $0.0336 per 1K resolution image" (flash-lite-image), "Equivalent to $0.0336 per 1K image"
 * (nano-banana-2.1), "$0.067 per 1K image" (3.1-flash-image).
 * OpenAI gpt-image-2.6 pages list token prices only, so they are not here.
 */
export const IMAGE_PRICE_USD: Record<string, number> = {
  'gemini-3.1-flash-lite-image': 0.0336,
  'gemini-nano-banana-2.1': 0.0336,
  'gemini-3.1-flash-image': 0.067,
};

/**
 * Won per US dollar for the Korean screen: Seoul Money Brokerage reference rate for 2026-11-17
 * (http://www.smbs.biz/ExRate/TodayExRate.jsp, "USD=1,335.00"). The amount is shown as "about".
 */
export const KRW_PER_USD = 1335;
export const PRICES_CHECKED_ON = '2026-11-17';

/** Rough cost of `count` pictures with this model, in dollars; null when the model has no stated per-picture price. */
export function picture_cost_usd(model: string, count: number): number | null {
  const price = IMAGE_PRICE_USD[model];
  return price === undefined ? null : price * count;
}
