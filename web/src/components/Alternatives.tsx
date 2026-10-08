import { useState } from "react";
import { Link } from "react-router-dom";
import { AlternativesResponse, useApi } from "../api";
import { LabelBadges } from "./Badges";
import { ALL_STAGES_NOTE, displayName, formatMoney, formatNumber } from "../lib/format";

type Goal = "protein" | "price";

export function Alternatives({ productId, stage, includeAllStages }: { productId: string; stage: string; includeAllStages: boolean }) {
  const [goal, setGoal] = useState<Goal>("protein");
  const { data, error, loading } = useApi<AlternativesResponse>(`/products/${encodeURIComponent(productId)}/alternatives?goal=${goal}&includeAllStages=${includeAllStages}`);

  const unit = goal === "protein" ? "g protein per 1000 kcal" : "per 1000 kcal";
  const show = (v: number) => (goal === "protein" ? formatNumber(v, 1) : formatMoney(v));

  return (
    <section aria-labelledby="alt-heading">
      <h2 id="alt-heading">Alternatives</h2>
      <p>Similar foods (same type, same label life stage) that do better on one thing you choose. There is no overall score.</p>
      <fieldset className="goal">
        <legend>I want</legend>
        <label className="check">
          <input type="radio" name="goal" checked={goal === "protein"} onChange={() => setGoal("protein")} />
          More protein per calorie
        </label>
        <label className="check">
          <input type="radio" name="goal" checked={goal === "price"} onChange={() => setGoal("price")} />
          Lower price per calorie
        </label>
      </fieldset>

      {includeAllStages && <p className="muted small">{ALL_STAGES_NOTE}</p>}

      {error && <p role="alert">Couldn't load alternatives: {error}</p>}
      {data && (
        <div aria-live="polite" className={loading ? "dim" : undefined}>
          {data.reason ? (
            <p>No comparison is possible: {data.reason}.</p>
          ) : data.alternatives.length === 0 ? (
            <p>
              Nothing among the {data.peerCount} similar food{data.peerCount === 1 ? "" : "s"} with a value beats this one on this measure.
              {data.peerCount === 0 && stage === "not-stated" ? " This label doesn't state a life stage, so there are no similar foods to compare with." : ""}
            </p>
          ) : (
            <>
              <p className="muted">
                {data.alternatives.length} of {data.peerCount} similar foods beat this food ({show(data.currentValue ?? 0)} {unit}).
              </p>
              <ol className="alt-list">
                {data.alternatives.map((a) => (
                  <li key={a.product.id}>
                    <div>
                      <Link to={`/product/${a.product.id}`}>{displayName(a.product)}</Link>{" "}
                      <LabelBadges product={a.product} />
                    </div>
                    <div>
                      <strong>
                        {show(a.value)} {unit}
                      </strong>{" "}
                      ({show(Math.abs(a.delta))} {a.delta > 0 ? "more" : "less"} than this food
                      {a.deltaPct !== undefined ? `, ${a.delta > 0 ? "+" : "−"}${Math.abs(a.deltaPct).toFixed(0)}%` : ""}) ·{" "}
                      <Link to={`/compare?ids=${productId},${a.product.id}`}>Compare</Link>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  );
}
