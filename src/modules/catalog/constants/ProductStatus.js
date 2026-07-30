// src/modules/catalog/constants/ProductStatus.js

module.exports = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",

  ALLOWED_TRANSITIONS: {
    DRAFT: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["INACTIVE", "ARCHIVED"],
    INACTIVE: ["ACTIVE", "ARCHIVED"],
    ARCHIVED: [],
  },
};
