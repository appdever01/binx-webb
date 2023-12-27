const path = require("path");

module.exports = {
  entry: "./public/assets/js/pay.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
};
