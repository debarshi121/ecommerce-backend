// src/modules/catalog/routes/index.js

const productRoutes = require("./product.routes");

const categoryRoutes = require("./category.routes");

const brandRoutes = require("./brand.routes");

module.exports = ({
  productController,
  categoryController,
  brandController,
  jwtMiddleware,
  permissionMiddleware,
}) => {
  return [
    {
      path: "/products",

      router: productRoutes({
        productController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },

    {
      path: "/categories",

      router: categoryRoutes({
        categoryController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },

    {
      path: "/brands",

      router: brandRoutes({
        brandController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },
  ];
};
