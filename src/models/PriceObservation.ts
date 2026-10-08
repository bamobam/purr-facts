/** One price for one product at one retailer on one date. Lives in data/prices.csv, not on Product. */
export interface PriceObservation {
  productId: string;
  retailer: string;
  /** CAD for one package as sold in this listing. */
  price: number;
  /** Total grams in this listing; sizes differ between retailers. */
  packageSizeG: number;
  /** ISO date the price was seen. */
  asOf: string;
  /** The listing the price was read from. */
  url: string;
}
