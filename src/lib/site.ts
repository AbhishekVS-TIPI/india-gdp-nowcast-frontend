/**
 * What every page says about itself, in one place so two pages cannot disagree: how many
 * indicators the panel holds, and when the estimate was last updated. The date is the day the
 * pipeline ran the model (nowcast.json `dataAsOf`), not the latest observation of any one series.
 */
import { NOWCAST } from "@/lib/nowcast";
import { fmtDate, indicators } from "@/lib/series";

/** Indicators that report monthly or faster. The quarterly ones (GDP itself among them) are not counted. */
export const HIGH_FREQUENCY_COUNT = indicators.filter((i) => i.frequency !== "Quarterly").length;

const UPDATED_ISO = NOWCAST?.dataAsOf ?? NOWCAST?.generatedAt?.slice(0, 10) ?? null;

export const UPDATED_LABEL = UPDATED_ISO ? fmtDate(Date.parse(`${UPDATED_ISO}T00:00:00Z`)) : null;

export const SITE_SUBTITLE = `${HIGH_FREQUENCY_COUNT} high-frequency indicators${
  UPDATED_LABEL ? ` · updated ${UPDATED_LABEL}` : ""
}`;
