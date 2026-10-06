/**
 * Policy-facing grouping of the indicators. A presentation choice, so it lives
 * here rather than in the pipeline's series.yaml; an indicator missing from the
 * map falls into "other" and is left out of the sector views.
 */

export type SectorKey =
  "industry" | "households" | "credit" | "trade" | "government" | "financial" | "global" | "prices";

export type Sector = {
  key: SectorKey;
  label: string;
  blurb: string;
  /** Background only: shown, but never counted as pointing to stronger or weaker growth. */
  context?: boolean;
};

export const SECTORS: Sector[] = [
  {
    key: "industry",
    label: "Industry & investment",
    blurb: "Factory output, power, cement, steel, goods movement",
  },
  { key: "households", label: "Households & jobs", blurb: "Consumption, rural wages, employment" },
  { key: "credit", label: "Credit & money", blurb: "Bank lending, deposits, money supply" },
  { key: "trade", label: "Trade & external", blurb: "Exports, imports, reserves, the rupee" },
  { key: "government", label: "Government", blurb: "Central government receipts and spending" },
  {
    key: "financial",
    label: "Financial conditions",
    blurb: "Interest rates, bond yields, equity markets",
  },
  {
    key: "global",
    label: "Global economy",
    blurb: "US and euro-area activity, US rates and equities",
  },
  { key: "prices", label: "Prices", blurb: "Inflation, shown as background", context: true },
];

const MEMBERS: Record<SectorKey, string[]> = {
  industry: [
    "cement_production_index",
    "coal_production_index",
    "crude_oil_production_index",
    "electricity_generation_index",
    "electricity_peak_demand",
    "gfcf_real_fred",
    "gst_eway_bill_volume",
    "house_price_index_allindia",
    "ici_overall",
    "iip_basic_metals",
    "iip_electricity_sector",
    "iip_general",
    "iip_infrastructure_construction_goods",
    "iip_intermediate_goods",
    "iip_manufacturing_sector",
    "iip_mining_sector",
    "steel_production_index",
  ],
  households: [
    "agricultural_rural_wages_men_avg",
    "gst_gross_revenue_collection",
    "petroleum_product_consumption",
    "plfs_lfpr_urban",
    "plfs_unemployment_rate_urban",
    "plfs_wpr_urban",
  ],
  credit: [
    "bank_credit_housing",
    "bank_credit_industries",
    "bank_credit_non_food",
    "bank_credit_personal_loans",
    "bank_credit_services",
    "money_supply_m0",
    "money_supply_m1",
    "money_supply_m3",
    "scb_aggregate_deposits",
  ],
  trade: [
    "balance_of_payments_overall_net_usd_mn",
    "crude_oil_imports_value",
    "current_account_balance_net_usd_mn",
    "forex_total_reserves",
    "merchandise_export_import_ratio",
    "neer_40currency",
    "net_foreign_exchange_assets_bankingsector",
    "non_oil_non_gold_imports",
    "petroleum_products_exports_value",
    "reer_40currency",
    "usdinr_exchange_rate",
  ],
  government: [
    "central_govt_capital_expenditure",
    "central_govt_revenue_expenditure",
    "central_govt_tax_revenue",
    "central_govt_total_receipts_ex_borrowing",
  ],
  financial: [
    "10y_gsec_yield",
    "bse_500_close",
    "bse_sensex_close",
    "gsec10y_minus_tbill91d_spread",
    "india_vix_close",
    "mibor_overnight",
    "nifty_500_close",
    "nifty_50_close",
    "repo_rate",
    "reverse_repo_rate",
    "slr",
    "tbill_91day_yield",
    "usdinr_6m_forward_premia",
  ],
  global: [
    "euro_area_industrial_production",
    "sp500_close",
    "us_fed_funds_rate_upper",
    "us_industrial_production_index",
  ],
  prices: [
    "brent_crude_spot_price",
    "cpi_al",
    "cpi_combined_urban_rural",
    "cpi_iw",
    "cpi_rl",
    "gold_price_mumbai_inr",
    "imf_world_commodity_price_index",
    "indian_crude_oil_basket_price",
    "wpi_all_commodities",
    "wpi_manufactured_products",
    "wpi_non_food_articles",
  ],
};

const SECTOR_OF: Record<string, SectorKey> = Object.fromEntries(
  Object.entries(MEMBERS).flatMap(([key, ids]) => ids.map((id) => [id, key as SectorKey])),
);

export function sectorOf(id: string): SectorKey | null {
  return SECTOR_OF[id] ?? null;
}

export function sectorLabel(key: SectorKey): string {
  return SECTORS.find((s) => s.key === key)!.label;
}

export function isContext(id: string): boolean {
  return sectorOf(id) === "prices";
}
