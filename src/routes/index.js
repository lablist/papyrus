const generate = require("./generate");
const users = require("./users");
const directions = require("./directions");

module.exports = function(app) {
  app.use('/users', users);
  app.use('/generate', generate);
  app.use('/directions', directions);
};
