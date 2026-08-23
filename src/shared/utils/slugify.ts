// src/shared/utils/slugify.ts

/** Lowercase, accent-stripped, hyphen-separated URL segment. */
export function slugify(value: string | number): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(new RegExp("[\u0300-\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
