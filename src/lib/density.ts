/** A density given as points, as exported in nowcast.json `nowcast.pdf`. */
export type DensityPoint = { x: number; y: number };

/**
 * Probability that the outcome lies above `t`, from a density given as points:
 * the trapezoid rule from `t` upwards, as a share of the density's total mass.
 * Dividing by the total keeps the answer a probability when the density is cut
 * off in its tails, and a `t` outside the points gives 0 or 1. Returns null if
 * the points cannot be integrated (fewer than two, or no mass).
 *
 * This is the same density the likely ranges are drawn from, so a probability
 * from here agrees with the range drawn beside it.
 */
export function massAbove(pdf: DensityPoint[], t: number): number | null {
  if (pdf.length < 2 || !Number.isFinite(t)) return null;
  let total = 0;
  let above = 0;
  for (let i = 0; i < pdf.length - 1; i++) {
    const a = pdf[i]!;
    const b = pdf[i + 1]!;
    const width = b.x - a.x;
    if (!(width > 0)) continue;
    const segment = (width * (a.y + b.y)) / 2;
    total += segment;
    if (t <= a.x) {
      above += segment;
    } else if (t < b.x) {
      const yAtT = a.y + ((b.y - a.y) * (t - a.x)) / width;
      above += ((b.x - t) * (yAtT + b.y)) / 2;
    }
  }
  if (!(total > 0) || !Number.isFinite(total)) return null;
  return Math.min(1, Math.max(0, above / total));
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}
