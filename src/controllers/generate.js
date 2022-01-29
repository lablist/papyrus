
const {
  existsSync,
  mkdirSync,
  writeFileSync
} = require("fs");
const path = require("path");
const ejs = require("ejs");
const _ = require("lodash");
const { query, queryOne } = require("../database");
const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");
const {
  _getDTree
} = require("./directions");
const {
  notFilledArray
} = require("../helpers/validations");

const appPath = path.resolve();

/*
  id_direction: '15',
  parent_id: '0',
  direction_path_name: 'contacts',
  rate: '8',
  level: 1,
  active: true,
  direction_name: 'contacts',
  human_name: 'Контакты',
  direction_type_id: '8',
  direction_type_name: 'Контакты',
  page_id: '28',
  page_name: '',
  site_description: '',
  change_seq_id: 2092,
  site_keywords: '',
  site_title: ''

  <ul>

              <li><a href="elements.html">Elements</a></li>
              <li>
                <span class="opener">Submenu</span>
                <ul>
*/

const leafIdName = "id_direction";
const branchIdName = "parent_id";
const orderName = "rate";
const pathName = "direction_path_name";
const humanName = "human_name";

function getBranch(nodes, pid="0") {
  return nodes.filter((l)=>{
    return (Number(l[branchIdName]) === Number(pid) )
  }).sort((a,b)=>(Number(a[orderName]) - Number(b[orderName])))
}

function leaf(nodes, leafItem, leafIndex) {
  const leafId = leafItem[leafIdName];
  const branch = getBranch(nodes, leafId);
  const aHref = `${leafItem[pathName]}.html`;
  if (notFilledArray(branch)) {
    return `<li><a href="${aHref}">${leafItem[humanName]}</a></li>`;
  }
  return `<li><span class="opener">${leafItem[humanName]}</span>${branches(nodes, leafId)}</li>`;
};

function branches(nodes, pid) {
  const branch = getBranch(nodes, pid);
  if (!notFilledArray(branch)) {
    return `<ul>${branch.map((leafItem, leafIndex) => leaf(nodes, leafItem, leafIndex)).join("")}</ul>`;
  }
}

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
    const cData = await queryOne('SELECT * FROM company LIMIT 1;');

    const homePathStr = path.join(appPath, "/src/views/pages/home.ejs");

    const dTree = await _getDTree();
    if (!dTree.ok) {
      console.error(dTree.data);
      statusError.message = dict.errors.unknown;
      return res.status(status.error).send(statusError);
    }
    const menuTree = branches(dTree.data, "0")

    const homeStr = await ejs.renderFile(homePathStr, {data: cData, menu: menuTree}, {async: false });

    const mainPathStr = path.join(appPath, "/src/public/index.html");
    writeFileSync(mainPathStr, homeStr, { encoding:'utf8', flag:'w' });

    const pages = await query('SELECT * FROM pages;');

    const pagePathTmpStr = path.join(appPath, "/src/views/pages/page.ejs");

    const renderPage = async (element) => {

      const pageId = element["page_id"];
      const pagePath = element["direction_path_name"] || "";
      const dbPage = pages.find(i=>i.id_page == pageId);
      let page = {
        name: "",
        photo: "",
        body: ""
      }
      console.log("dbPage", dbPage);

      if (pagePath.length <= 0 || !dbPage) {
        return;
      }

      if (pageId) {
        page = {
          name: dbPage.page_name,
          photo: dbPage.page_photo ? `<span class="image main"><img src="${dbPage.page_photo}" alt="" /></span>` : "",
          body: dbPage.page_body
        }
      }
      const pagePathStr = path.join(appPath, `/src/public/${pagePath}.html`);
      const pagePathDirStr = path.dirname(pagePathStr);
      const pageFileStr = path.basename(pagePathStr);
      if (!existsSync(pagePathDirStr)) {
        mkdirSync(pagePathDirStr);
      }

      const homeStr = await ejs.renderFile(pagePathTmpStr, {data: {
        site_title: dbPage?.site_title ? dbPage?.site_title : cData.site_title,
        site_keywords: dbPage?.site_keywords ? dbPage?.site_keywords : cData.site_keywords,
        site_description: dbPage?.site_description ? dbPage?.site_description : cData.site_description
      }, page: page, menu: menuTree}, {async: false });
      writeFileSync(pagePathStr, homeStr, { encoding:'utf8', flag:'w' });
    }

    dTree.data.forEach(element => renderPage(element));

  } catch (error) {
    console.error(error);
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
