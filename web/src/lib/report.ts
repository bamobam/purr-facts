/** Fills the `{food}` placeholder (URL-encoded) so a form can be prefilled; removes it when no food is given. */
export function fillReportUrl(template: string, food?: string): string {
  return template.replace(/\{food\}/g, encodeURIComponent(food ?? ""));
}
