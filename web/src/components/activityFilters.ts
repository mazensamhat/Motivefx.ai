import type { ActivityFilter } from "./ActivityPanel";

export const SIDE_FILTER: ActivityFilter = {
  key: "side",
  label: "Side",
  type: "select",
  param: "side",
  options: [
    { value: "buy", label: "Buy" },
    { value: "sell", label: "Sell" },
  ],
};

export const DATE_FROM_FILTER: ActivityFilter = {
  key: "date_from",
  label: "From",
  type: "datetime-local",
  param: "date_from",
};

export const DATE_TO_FILTER: ActivityFilter = {
  key: "date_to",
  label: "To",
  type: "datetime-local",
  param: "date_to",
};

export const MIN_PRICE_FILTER: ActivityFilter = {
  key: "min_price",
  label: "Min price",
  type: "number",
  placeholder: "0.01",
  param: "min_price",
};

export const MAX_PRICE_FILTER: ActivityFilter = {
  key: "max_price",
  label: "Max price",
  type: "number",
  placeholder: "5.00",
  param: "max_price",
};

export const STOCK_PRICE_FILTERS: ActivityFilter[] = [
  MIN_PRICE_FILTER,
  { ...MAX_PRICE_FILTER, placeholder: "1000" },
];

export const PENNY_PRICE_FILTERS: ActivityFilter[] = [
  MIN_PRICE_FILTER,
  { ...MAX_PRICE_FILTER, placeholder: "5.00" },
];

export const CRYPTO_PRICE_FILTERS: ActivityFilter[] = [
  { ...MIN_PRICE_FILTER, label: "Min token price", placeholder: "1" },
  { ...MAX_PRICE_FILTER, label: "Max token price", placeholder: "100000" },
];
