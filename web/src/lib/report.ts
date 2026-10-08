/**
 * Fills the `{food}` placeholder (URL-encoded) so a form can be prefilled; removes it when no food is
 * given. Also accepts the percent-encoded form (`%7Bfood%7D`), which is what Google Forms writes into a
 * pre-filled link when you type `{food}` as the sample answer.
 */
export function fillReportUrl(template: string, food?: string): string {
  return template.replace(/\{food\}|%7Bfood%7D/gi, encodeURIComponent(food ?? ""));
}
