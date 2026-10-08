import { useAppData } from "../AppData";
import { ReportLink } from "../components/ReportLink";

export function About() {
  const { meta } = useAppData();
  return (
    <>
      <h1>About this data</h1>
      <p className="lede">
        Purr Facts compares figures printed on Canadian cat food labels and manufacturer pages. It is a data tool. It does not tell you what to feed your cat.
      </p>

      <section aria-labelledby="not-heading">
        <h2 id="not-heading">What this is not</h2>
        <ul>
          <li>It is not veterinary or nutrition advice. Talk to a vet about your cat's needs, especially for kittens, seniors and cats with a health condition.</li>
          <li>It does not rate, score or rank foods as good or bad. "Higher protein per calorie" is a fact about the label, not a recommendation: it suits some cats and not others.</li>
          <li>
            It is not complete. It covers a small set of complete foods ({meta?.productCount ?? "a few dozen"} foods) from a handful of brands sold in Canada. Kitten, prescription and treat products are left out.
          </li>
          <li>A food missing from the recall lists has not necessarily never been recalled. "None found" is never the same as "safe".</li>
        </ul>
      </section>

      <section aria-labelledby="mistake-heading">
        <h2 id="mistake-heading">Found a mistake?</h2>
        <p>Tell us which food and what its label or source says, and we will check it.</p>
        <p>
          <ReportLink />
        </p>
      </section>

      <section aria-labelledby="figures-heading">
        <h2 id="figures-heading">Where the figures come from</h2>
        <p>
          Nutrition figures are read from manufacturer pages and label images, mostly Canadian ones (Fromm's come from its North American site), and each food links to its source with the date it was last checked. Labels give <strong>guaranteed minimums</strong> for protein and fat and{" "}
          <strong>maximums</strong> for fibre and moisture, not measured values. We always show which one a number is ("≥ 9%"). Because they are minimums, the real amounts are at least what is shown.
        </p>
        <p>
          In Canada a nutritional adequacy statement is voluntary, so some labels have one, some cite the European FEDIAF profiles instead of the American AAFCO ones, and some have none. The badge on each food reports what its
          label says; it is not a quality mark.
        </p>
        <p>
          When the calories printed on a label disagree with an estimate from its protein, fat and moisture by more than a normal margin, the build flags the row for a human to recheck before it ships.
        </p>
      </section>

      <section aria-labelledby="calc-heading">
        <h2 id="calc-heading">How the numbers are worked out</h2>
        <dl>
          <dt>Grams per 1000 kcal</dt>
          <dd>The grams of protein or fat in the amount of food that supplies 1000 kcal. It puts wet and dry foods on the same footing, which percentages on the bag cannot do.</dd>
          <dt>Dry matter</dt>
          <dd>The percentage with the water taken out: as-fed percentage ÷ (100 − moisture) × 100.</dd>
          <dt>Share of calories</dt>
          <dd>Protein counts 3.5 kcal per gram and fat 8.5 kcal per gram.</dd>
          <dt>Price</dt>
          <dd>
            The median of recent listings (last 90 days) from Canadian retailers, in CAD, shown per lb, per kg and per 1000 kcal. Wet food uses the case size and dry food the larger bag. A food with no recent listing is left out of
            price comparisons.
          </dd>
          <dt>"How it compares" and alternatives</dt>
          <dd>
            Foods are compared only with foods of the same type (wet or dry) and the same life stage claimed on the label (adult maintenance, all life stages, or not stated). A comparison needs at least 8 other foods with a
            value, or it is hidden. An alternative has to beat the current food on the one measure you pick; there is no combined score.
          </dd>
        </dl>
      </section>

      <section aria-labelledby="recall-heading">
        <h2 id="recall-heading">Recalls and safety alerts</h2>
        <p>{meta?.incidentScope ?? "Loading…"}</p>
        {meta && (
          <>
            <p>Entries come in three labelled kinds:</p>
            <dl>
              <dt>Regulator notice</dt>
              <dd>{meta.incidentTiers.regulator}</dd>
              <dt>Company or trade report</dt>
              <dd>{meta.incidentTiers["company-or-trade"]}</dd>
              <dt>Regulator investigation</dt>
              <dd>{meta.incidentTiers.report}</dd>
            </dl>
            <h3>Sources searched</h3>
            <ul>
              {meta.incidentChecks.map((c) => (
                <li key={`${c.tier}-${c.brand ?? c.jurisdiction}-${c.source}`}>
                  <a href={c.url} target="_blank" rel="noreferrer">
                    {c.source}
                  </a>{" "}
                  (searched {c.checkedOn})
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="fresh-heading">
        <h2 id="fresh-heading">How fresh it is</h2>
        {meta ? (
          <p>
            Data built {meta.builtAt}. Nutrition last checked as early as {meta.oldestLastVerified ?? "unknown"}; prices as early as {meta.oldestPriceAsOf ?? "unknown"}; recalls last searched{" "}
            {meta.incidentsCheckedOn ?? "never"}. {Math.round(meta.priceCoverage * 100)}% of foods have a recent price. Retailer prices change often, so check the retailer before buying.
          </p>
        ) : (
          <p>Loading…</p>
        )}
      </section>
    </>
  );
}
