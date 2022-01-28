const _ = require("lodash");
const { query, loggedQuery, queryOne } = require("../database");
const {
  empty
} = require("../helpers/validations");
const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");
const {
  unlinkFiles,
  uploadImg,
  getImagePath,
  getImagePublicPath
} = require("../helpers/files");

const dict = {
  success: {
    dataReceived: "Данные получены.",
    dataUpdated: "Данные обновлены.",
    dataAdded: "Данные добавлены."
  },
  errors: {
    unknown: "Неизвестная ошибка.",
    emptyDID: "Требуется идентификатор директории.",
    emptyID: "Требуется идентификатор страницы.",
    fakePageId: "Несуществующий идентификатор страницы.",
  }
}

const create = async (req, res) => {
  const {
    did
  } = req.body;

  if (empty(did)) {
    statusError.message = dict.errors.emptyDID;
    return res.status(status.error).send(statusError);
  }

  try {
    const createPageQuery = `
      INSERT INTO pages (
        page_name,
        page_body,
        page_photo
      )
      VALUES ('', '', '') returning *;
    `;

    const [ dbResponse ] = await loggedQuery(req.user.id, createPageQuery);

    if (dbResponse?.id_page) {
      await loggedQuery(
        req.user.id,
        `UPDATE directions SET page_id = $1, change_seq_id=nextval('id_change'::regclass) WHERE id_direction=$2 returning *;`,
        [dbResponse?.id_page, did]
      );
    }

    statusSuccess.data = {
      id: dbResponse.id_page,
      name: _.toString(dbResponse.page_name),
      body: _.toString(dbResponse.page_body),
      photo: getImagePublicPath(dbResponse.page_photo)
    };

    statusSuccess.message = dict.success.dataAdded;
    return res.status(status.success).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}


const read = async (req, res) => {
  const { id } = req.query;

  if (empty(id)) {
    statusError.message = dict.errors.emptyID;
    return res.status(status.error).send(statusError);
  }
  try {
    const getPageQuery = `
      SELECT
        *
      FROM 
        pages p
      WHERE
        p.id_page = ${id};
    `;

    const dbResponse = await queryOne(getPageQuery);

    statusSuccess.data = {
      id: dbResponse.id_page,
      name: _.toString(dbResponse.page_name),
      body: _.toString(dbResponse.page_body),
      photo: getImagePublicPath(dbResponse.page_photo)
    };

    statusSuccess.message = dict.success.dataReceived;
    return res.status(status.success).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

const update = async (req, res) => {
  const {
    id,
    name,
    body
  } = req.body;
  const filePath = req?.file?.path;

  if (empty(id)) {
    unlinkFiles([filePath]);
    statusError.message = dict.errors.emptyID;
    return res.status(status.bad).send(statusError);
  }

  try {
    const getOldPageQuery = `SELECT * FROM pages p WHERE id_page = $1 LIMIT 1;`;
    const oldPage = await queryOne(getOldPageQuery, [id]);

    if (!oldPage || _.isEmpty(oldPage)) {
      unlinkFiles([filePath]);
      statusError.message = dict.errors.fakePageId;
      return res.status(status.notfound).send(statusError);
    }

    const updateUserQuery = `
      UPDATE pages SET
        page_name=$1,
        page_body=$2,
        page_photo=$3,
        change_seq_id=nextval('id_change'::regclass)
      WHERE id_page=$4 returning *;
    `;

    if (!_.isEmpty(filePath) &&_.isString(oldPage.photo)) {
      unlinkFiles([getImagePath(oldPage.photo)]);
    }

    const updateValue = [
      _.isUndefined(name) ? oldPage.page_name : name,
      _.isUndefined(body) ? oldPage.page_body : body,
      _.isEmpty(filePath) ? oldPage.page_photo : uploadImg(filePath, "page"),
      id
    ];

    const [ updateResponse ] = await loggedQuery(req.user.id, updateUserQuery, updateValue);

    statusSuccess.data = {
      id: updateResponse?.id_page,
      name: updateResponse?.page_name,
      body: updateResponse?.page_body,
      photo: getImagePublicPath(updateResponse?.page_photo)
    };

    statusSuccess.message = dict.success.dataUpdated;
    return res.status(status.created).send(statusSuccess);
  } catch (error) {
    console.error(error);
    unlinkFiles([filePath]);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

module.exports = {
  create,
  read,
  update
}
