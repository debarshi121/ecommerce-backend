// src/shared/utils/slugify.js

function slugify(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = slugify;
