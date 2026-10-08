import { Product } from "../models/Product";

/**
 * Two foods are peers when they are the same food type and claim the same life stage. The standard
 * a label cites (AAFCO or FEDIAF) does not split groups; it is shown as a badge. With
 * `includeAllStages`, adult-maintenance and all-life-stages foods are peers. A food with no stated
 * stage only ever matches other unstated foods, so it never leaks into someone else's benchmark.
 */
export function isPeer(a: Product, b: Product, includeAllStages = false): boolean {
  if (a.foodType !== b.foodType) {
    return false;
  }
  if (a.adequacyStage === b.adequacyStage) {
    return true;
  }
  if (!includeAllStages) {
    return false;
  }
  return a.adequacyStage !== "not-stated" && b.adequacyStage !== "not-stated";
}
