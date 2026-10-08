export interface ValidationIssue {
  /** Errors fail the build; warnings are surfaced but do not. */
  severity: "error" | "warning";
  /** The product (or, for prices, the product the observation refers to) the issue belongs to. */
  productId: string;
  field?: string;
  message: string;
}

export interface ValidationOptions {
  /** ISO date treated as "today"; injectable so tests are deterministic. */
  today?: string;
}
