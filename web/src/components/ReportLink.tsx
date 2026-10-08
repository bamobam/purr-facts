import { useAppData } from "../AppData";
import { fillReportUrl } from "../lib/report";

/** A link to the maintainer's error-report page; renders nothing when none is configured. */
export function ReportLink({ food, label = "Report an error" }: { food?: string; label?: string }) {
  const { reportUrl } = useAppData();
  if (reportUrl === undefined) {
    return null;
  }
  return (
    <a className="button-link" href={fillReportUrl(reportUrl, food)} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
