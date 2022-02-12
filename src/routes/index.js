const generate = require("./generate");
const users = require("./users");
const directions = require("./directions");
const company = require("./company");
const directionsTypes = require("./directionsTypes");
const pages = require("./pages");
const backup = require("./backup");
const priceTypes = require("./priceTypes");
const prices = require("./prices");
const { apiDir } = require("../config");

const rPaths = {
  users: `/${apiDir}/users`,
  generate: `/${apiDir}/generate`,
  directions: `/${apiDir}/directions`,
  company: `/${apiDir}/company`,
  directionsTypes: `/${apiDir}/directionsTypes`,
  backup: `/${apiDir}/backup`,
  pages: `/${apiDir}/pages`,
  priceTypes: `/${apiDir}/priceTypes`,
  prices: `/${apiDir}/prices`,
}

module.exports = function(app) {
  app.use(rPaths.users, users);
  app.use(rPaths.generate, generate);
  app.use(rPaths.directions, directions);
  app.use(rPaths.company, company);
  app.use(rPaths.directionsTypes, directionsTypes);
  app.use(rPaths.pages, pages);
  app.use(rPaths.backup, backup);
  app.use(rPaths.priceTypes, priceTypes);
  app.use(rPaths.prices, prices);
};
