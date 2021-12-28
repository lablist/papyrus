
const { writeFileSync } = require("fs");
const path = require("path");
const ejs = require("ejs");
const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");
const appPath = path.resolve();

const all = async (req, res) => {
  const mainPathStr = path.join(appPath, "/src/public/");

  const headerPathStr = path.join(appPath, "/src/views/partials/header.ejs");
  const wrapperPathStr = path.join(appPath, "/src/views/partials/wrapper.ejs");
  const footerPathStr = path.join(appPath, "/src/views/partials/footer.ejs");
  
  const headerStr = await ejs.renderFile(headerPathStr);
  const wrapperStr = await ejs.renderFile(wrapperPathStr);
  const footerStr = await ejs.renderFile(footerPathStr);

  writeFileSync(mainPathStr+"index.html", [headerStr, wrapperStr, footerStr].join("\r\n"),{encoding:'utf8',flag:'w'});

  statusSuccess.message = "Сайт создан.";
  return res.status(status.created).send(statusSuccess);
}

module.exports = {
  all
};
