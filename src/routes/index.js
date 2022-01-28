const generate = require("./generate");
const users = require("./users");
const directions = require("./directions");
const company = require("./company");
const directionsTypes = require("./directionsTypes");
const pages = require("./pages");
const { apiDir } = require("../config");

const rPaths = {
  users: `/${apiDir}/users`,
  generate: `/${apiDir}/generate`,
  directions: `/${apiDir}/directions`,
  company: `/${apiDir}/company`,
  directionsTypes: `/${apiDir}/directionsTypes`,
  pages: `/${apiDir}/pages`
}

module.exports = function(app) {
  app.use(rPaths.users, users);
  app.use(rPaths.generate, generate);
  app.use(rPaths.directions, directions);
  app.use(rPaths.company, company);
  app.use(rPaths.directionsTypes, directionsTypes);
  app.use(rPaths.pages, pages);
};
