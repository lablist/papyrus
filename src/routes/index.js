const generate = require("./generate");
const users = require("./users");
const directions = require("./directions");
const { apiDir } = require("../config");

const rPaths = {
  users: `/${apiDir}/users`,
  generate: `/${apiDir}/generate`,
  directions: `/${apiDir}/directions`,
}

module.exports = function(app) {
  app.use(rPaths.users, users);
  app.use(rPaths.generate, generate);
  app.use(rPaths.directions, directions);
};
