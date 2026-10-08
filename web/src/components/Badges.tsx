import { stageLabel, standardLabel } from "../lib/format";
import type { Product } from "../api";

/** Text badges: the standard is information about the label, never a quality mark. */
export function LabelBadges({ product }: { product: Product }) {
  return (
    <span className="badges">
      <span className="badge">{stageLabel(product.adequacyStage)}</span>
      <span className="badge badge-quiet">{standardLabel(product.adequacyStandard)}</span>
    </span>
  );
}
