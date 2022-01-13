
const { writeFileSync } = require("fs");
const path = require("path");
const ejs = require("ejs");
const _ = require("lodash");
const { query } = require("../database");
const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");
const appPath = path.resolve();


const dict = {
  success: {
    created: "Сайт создан.",
  },
  errors: {
    unknown: "Неизвестная ошибка.",
    template: "Ошибка сборки шаблона страницы."
  }
}

const all = async (req, res) => {
  try {
    const getCompany = await query('SELECT * FROM company LIMIT 1;');
    const cData = getCompany[0];
    const homePathStr = path.join(appPath, "/src/views/pages/home.ejs");
    const homeStr = await ejs.renderFile(homePathStr, {data: cData}, {async: false });
    console.log("homeStir", homeStr);

    const mainPathStr = path.join(appPath, "/src/public/index.html");
    writeFileSync(mainPathStr, homeStr, { encoding:'utf8', flag:'w' });
  } catch (error) {
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
  statusSuccess.data= {} 
  statusSuccess.message = dict.success.created;
  return res.status(status.created).send(statusSuccess);
}

module.exports = {
  all
};
