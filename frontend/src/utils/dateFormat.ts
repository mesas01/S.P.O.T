import i18n from "../i18n";

export function getDateLocale(): string {
  const lang = i18n.language;
  if (lang?.startsWith("en")) return "en-US";
  return "es-ES";
}

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(getDateLocale(), options);
}
