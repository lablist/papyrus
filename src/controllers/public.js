const path = require("path");
const home = async (req, res) => {

  return res.render('home', {todos: [1, 2] });
};

module.exports = {
  home
};
