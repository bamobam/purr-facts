import { Link } from "react-router-dom";
import { useAppData } from "../AppData";
import { ReportLink } from "./ReportLink";

export function Footer() {
  const { meta, reportUrl } = useAppData();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          Purr Facts compares figures printed on Canadian cat food labels. It is a data tool, not veterinary or nutrition advice, and it doesn't rate or score foods. <Link to="/about">How the data works and what it leaves out</Link>.
        </p>
        {reportUrl !== undefined && (
          <p>
            Found a mistake? <ReportLink />
          </p>
        )}
        {meta && (
          <p className="muted">
            Data built {meta.builtAt}. Nutrition last checked against the label or manufacturer page as early as {meta.oldestLastVerified ?? "unknown"}; prices as early as{" "}
            {meta.oldestPriceAsOf ?? "unknown"} ({Math.round(meta.priceCoverage * 100)}% of foods have a recent price, in CAD). Recalls last searched {meta.incidentsCheckedOn ?? "never"}.
          </p>
        )}
      </div>
    </footer>
  );
}
