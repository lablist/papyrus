const _ = require("lodash");
const { query, loggedQuery } = require("../database");
const {
  getOrderStr,
  getLimitStr,
  getWhereStr
} = require("../helpers/queryParser");
const {
  comparePassword,
  validatePassword,
  empty,
  generateUserToken,
  hashPassword,
  isValidEmail
} = require("../helpers/validations");
const sqlInjection = require("../helpers/sqlInjection");
const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");
const {
  unlinkFiles,
  uploadImg
} = require("../helpers/files");

const dict = {
  success: {
    login: "Успешный вход в систему.",
    dataReceived: "Данные получены.",
    dataUpdated: "Данные обновлены.",
    dataAdded: "Данные добавлены."
  },
  errors: {
    unknown: "Неизвестная ошибка.",
    forbidden: "В доступе отказано.",
    sqlInjection: "В запросе обнаружен SQL. Отклонено.",
    emptyUserId: "Требуется идентификатор пользователя.",
    emptyLoginOrPassword: "Требуются логин и пароль.",
    emptyLoginOrPasswordOrEmail: "Требуются логин, пароль и адрес электронной почты.",
    validatePassword: "Пароль должен состоять не менее чем из восьми символов, содержать как минимум одну заглавную букву, одну строчную букву и одну цифру.",
    fakePassword: "Вы ввели неверный пароль.",
    fakeUserLogin: "Пользователь с таким логином не существует.",
    fakeUserId: "Пользователь с таким идентификатором не существует.",
    fakeEmail: "Требуется действующий адрес электронной почты.",
    duplicateUserEmail: "Пользователь с таким адресом электронной почты уже существует.",
    duplicateUserLogin: "Пользователь с таким логином уже существует.",
    oldPasswordRequired: "Требуется старый пароль."
  }
}

const login = async (req, res) => {
  const { login, password } = req.body;

  const hasSql = sqlInjection(req.originalUrl + " " + login + " " + password);
  if (hasSql) {
    statusError.message = dict.errors.sqlInjection;
    return res.status(status.forbidden).send(statusError);
  }

  if (empty(login) || empty(password)) {
    statusError.message = dict.errors.emptyLoginOrPassword;
    return res.status(status.bad).send(statusError);
  }

  if (!validatePassword(password)) {
    statusError.message = dict.errors.validatePassword;
    return res.status(status.bad).send(statusError);
  }

  const signinUserQuery = `
    SELECT
      u.id_user as id,
      u.login,
      u.hashed_password,
      u.email,
      coalesce(u.first_name, '') as firstname,
      coalesce(u.middle_name, '') as middlename,
      coalesce(u.last_name, '') as lastname,
      TRIM(CONCAT(u.last_name, ' ', u.first_name, ' ', u.middle_name)) as fio,
      coalesce(u.description, '') as description,
      u.active,
      coalesce(u.photo, '') as photo,
      array_remove(array_agg(ur.right_id), NULL) AS rights
    FROM users u
    LEFT JOIN users_rights ur ON ur.user_id = id_user
    WHERE login = $1
    GROUP BY u.id_user
    LIMIT 1;
  `;

  try {
    const dbResponse = await query(signinUserQuery, [login]);
    const firstRow = _.first(dbResponse);
    if (!firstRow) {
      statusError.message = dict.errors.fakeUserLogin;
      return res.status(status.notfound).send(statusError);
    }
    if (!firstRow.active) {
      statusError.message = dict.errors.forbidden;
      return res.status(status.forbidden).send(statusError);
    }
    if (!comparePassword(password, firstRow.hashed_password)) {
      statusError.message = dict.errors.fakePassword;
      return res.status(status.bad).send(statusError);
    }

    const token = generateUserToken(firstRow);
    statusSuccess.data = {
      id: firstRow.id,
      login: firstRow.login,
      email: firstRow.email,
      firstname: firstRow.firstname,
      middlename: firstRow.middlename,
      lastname: firstRow.lastname,
      fio: firstRow.fio,
      description: firstRow.description,
      photo: firstRow.photo,
      rights: firstRow.rights,
      token: token
    };
    statusSuccess.message = dict.success.login;
    return res.status(status.success).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
};

const usersFields = {
  id: 'u.id_user',
  login: 'u.login',
  email: 'u.email',
  firstname: 'u.first_name',
  middlename: 'u.middle_name',
  lastname: 'u.last_name',
  fio: 'u.last_name || u.first_name || u.middle_name',
  description: 'u.description',
  active: 'u.active',
  photo: 'u.photo',
  rights: 'rights'
}

const filters = async (req, res) => {
  const { page=1, limit=15, filters={id: {operator: "isnotnull", value: ""}}, orderField='id', orderFieldReversed=false } = req.body;

  try {
    const getUsersQuery = `
      SELECT
        u.id_user as id,
        u.login,
        u.email,
        coalesce(u.first_name, '') as firstname,
        coalesce(u.middle_name, '') as middlename,
        coalesce(u.last_name, '') as lastname,
        TRIM(CONCAT(u.last_name, ' ', u.first_name, ' ', u.middle_name)) as fio,
        coalesce(u.description, '') as description,
        u.active,
        coalesce(u.photo, '') as photo,
        array_remove(array_agg(ur.right_id), NULL) AS rights,
        count(*) OVER() as allrows
      FROM 
        users u
      LEFT JOIN users_rights ur ON ur.user_id = id_user
      ${getWhereStr(filters, usersFields)}
      GROUP BY u.id_user
      ${getOrderStr(orderField, orderFieldReversed, usersFields)}
      ${getLimitStr(page, limit)}
    `;
    statusSuccess.data = await query(getUsersQuery);
    statusSuccess.message = dict.success.dataReceived;
    return res.status(status.success).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

const read = async (req, res) => {

  try {
    const getQuery = `
    WITH RECURSIVE nodes(
      id_direction, parent_id, direction_path_name, 
      rate, level
    ) AS (
      SELECT 
        d1.id_direction, 
        d1.parent_id, 
        d1.direction_name :: text, 
        row_number() over (
          order by 
            d1.rate
        ) as rate, 
        1 
      FROM 
        directions d1 
      WHERE 
        d1.parent_id = 0 
      UNION 
      SELECT 
        d2.id_direction, 
        d2.parent_id, 
        concat(
          ns.direction_path_name :: text, '/', 
          d2.direction_name
        ), 
        (
          select 
            rate 
          from 
            (
              select 
                row_number() over (
                  order by 
                    d3.rate
                ) as rate, 
                d3.id_direction 
              from 
                directions d3 
              where 
                d3.parent_id = ns.id_direction 
              order by 
                d3.rate
            ) d4 
          where 
            d4.id_direction = d2.id_direction
        ) as rate, 
        ns.level + 1 
      FROM 
        directions d2, 
        nodes ns 
      WHERE 
        d2.parent_id = ns.id_direction
    ) 
    SELECT 
      ns.id_direction, 
      ns.parent_id, 
      ns.direction_path_name, 
      ns.rate, 
      ns.level, 
      d.active, 
      d.direction_name, 
      d.human_name, 
      d.direction_type_id, 
      dt.direction_name, 
      d.page_id, 
      p.page_name, 
      d.site_description, 
      d.change_seq_id, 
      d.site_keywords, 
      d.site_title 
    FROM 
      nodes ns 
      LEFT JOIN directions d ON d.id_direction = ns.id_direction 
      LEFT JOIN directions_types dt ON dt.id_direction_type = d.direction_type_id 
      LEFT JOIN pages p ON p.id_page = d.page_id 
    ORDER BY 
      ns.rate;
    `;
    const dbResponse = await query(getQuery);
    statusSuccess.data = dbResponse;
    statusSuccess.message = dict.success.dataReceived;
    return res.status(status.success).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

const create = async (req, res) => {
  const {
    login,
    email,
    password,
    firstname,
    middlename,
    lastname,
    description,
    active=false,
    rights=[]
  } = req.body;
  const filePath = req.file.path;

  if (empty(login) || empty(password) || empty(email)) {
    unlinkFiles([filePath]);
    statusError.message = dict.errors.emptyLoginOrPasswordOrEmail;
    return res.status(status.bad).send(statusError);
  }

  if (!isValidEmail(email)) {
    statusError.message = dict.errors.fakeEmail;
    return res.status(status.bad).send(statusError);
  }

  if (!validatePassword(password)) {
    unlinkFiles([filePath]);
    statusError.message = dict.errors.validatePassword;
    return res.status(status.bad).send(statusError);
  }

  try {
    const doubleUser = await _getDoubleLoginOrEmail(login, email);
    if (!_.isEmpty(doubleUser)) {
      if (doubleUser.login) {
        unlinkFiles([filePath]);
        statusError.message = dict.errors.duplicateUserLogin;
        return res.status(status.error).send(statusError);
      }
      if (doubleUser.email) {
        unlinkFiles([filePath]);
        statusError.message = dict.errors.duplicateUserEmail;
        return res.status(status.error).send(statusError);
      }
    }
  } catch (error) {
    console.error(error);
    unlinkFiles([filePath]);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }

  const hashedPassword = hashPassword(password);
  const createUserQuery = `
    INSERT INTO users (
      login,
      hashed_password,
      email,
      first_name,
      middle_name,
      last_name,
      description,
      active,
      photo
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    returning *;
  `;

  const imgFilePath = uploadImg(lxFilePath, "photo");
  try {
    const dbResponse = await loggedQuery(req.user.id, createUserQuery, [
      login,
      hashedPassword,
      email,
      firstname,
      middlename,
      lastname,
      description,
      active,
      imgFilePath
    ]);
    const firstRow = _.first(dbResponse);
    let rightsResponse = []
    if (!_.isEmpty(rights)) {
      rightsResponse = await loggedQuery(req.user.id, `INSERT INTO users_rights(user_id, right_id) VALUES(${firstRow.id_user}, unnest(ARRAY[${rights}])) returning right_id;`);
    }

    statusSuccess.data = {
      id: firstRow?.id_user,
      login: firstRow?.login,
      email: firstRow?.email,
      firstname: _.toString(firstRow?.first_name),
      middlename: _.toString(firstRow?.middle_name),
      lastname: _.toString(firstRow?.last_name),
      fio: [_.toString(firstRow?.last_name), _.toString(firstRow?.first_name), _.toString(firstRow?.middle_name)].join(' ').trim(),
      description: _.toString(firstRow?.description),
      active: firstRow?.active,
      photo: _.toString(firstRow?.photo),
      rights: _.map(rightsResponse, "right_id")
    };
    statusSuccess.message = dict.success.dataAdded;
    return res.status(status.created).send(statusSuccess);
  } catch (error) {
    console.error(error);
    unlinkFiles([lxFilePath]);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
};

const update = async (req, res) => {
  const {
    id,
    login,
    email,
    firstname,
    middlename,
    lastname,
    description,
    active,
    rights,
    oldPassword,
    newPassword
  } = req.body;
  const filePath = req.file.path;

  if (empty(id)) {
    unlinkFiles([filePath]);
    statusError.message = dict.errors.emptyUserId;
    return res.status(status.bad).send(statusError);
  }

  if (!empty(email) && !isValidEmail(email)) {
    unlinkFiles([filePath]);
    statusError.message = dict.errors.fakeEmail;
    return res.status(status.bad).send(statusError);
  }

  if (!empty(newPassword) && !validatePassword(newPassword)) {
    unlinkFiles([filePath]);
    statusError.message = dict.errors.validatePassword;
    return res.status(status.bad).send(statusError);
  }

  const selfUpdate = (_.toString(id) === _.toString(req.user.id));
  const getUserQuery = `
    SELECT
      u.id_user as id,
      u.login,
      u.hashed_password,
      u.email,
      u.first_name,
      u.middle_name,
      u.last_name,
      u.description,
      u.active,
      u.photo
    FROM users u
    WHERE id_user = $1
    LIMIT 1;
  `;

  try {
    const getUserResponse = await query(getUserQuery, [id]);
    const oldUser = _.first(getUserResponse);
    if (!oldUser) {
      unlinkFiles([filePath]);
      statusError.message = dict.errors.fakeUserId;
      return res.status(status.notfound).send(statusError);
    }

    if (selfUpdate && !empty(newPassword) && empty(oldPassword)) {
      unlinkFiles([filePath]);
      statusError.message = dict.errors.oldPasswordRequired;
      return res.status(status.bad).send(statusError);
    }

    if (selfUpdate && !empty(newPassword) && !comparePassword(oldPassword, oldUser.hashed_password)) {
      unlinkFiles([filePath]);
      statusError.message = dict.errors.fakePassword;
      return res.status(status.bad).send(statusError);
    }

    const doubleUser = await _getDoubleLoginOrEmail(login, email, id);
    if (!_.isEmpty(doubleUser)) {
      if (doubleUser.login) {
        unlinkFiles([filePath]);
        statusError.message = dict.errors.duplicateUserLogin;
        return res.status(status.error).send(statusError);
      }
      if (doubleUser.email) {
        unlinkFiles([filePath]);
        statusError.message = dict.errors.duplicateUserEmail;
        return res.status(status.error).send(statusError);
      }
    }

    let rightsArr = [];
    if (!_.isUndefined(rights)) {
      let updateQuery = `DELETE FROM users_rights WHERE user_id = ${id};`;
      if (!_.isEmpty(rights)) {
        updateQuery = `
          ${updateQuery}
          INSERT INTO users_rights(user_id, right_id) VALUES(${id}, unnest(ARRAY[${rights}])) returning *;
        `;
      }
      const rightsResponse = await loggedQuery(req.user.id, updateQuery);
      rightsArr = _.map(rightsResponse, "right_id")
    }

    const hashedPassword = !empty(newPassword) ? hashPassword(newPassword) : oldUser.hashed_password;

    const updateUserQuery = `
      UPDATE users SET
        login=$1,
        hashed_password=$2,
        email=$3,
        first_name=$4,
        middle_name=$5,
        last_name=$6,
        description=$7,
        active=$8,
        photo=$9,
        change_seq_id=nextval('id_change'::regclass)
      WHERE id_user=$10 returning *;
    `;

    if (!_.isEmpty(filePath) &&_.isString(oldUser.photo)) {
      unlinkFiles([`src/public/img/assets/${oldUser.photo}`]);
    }

    const updateValue = [
      _.isUndefined(login) ? oldUser.login : login,
      hashedPassword,
      _.isUndefined(email) ? oldUser.email : email,
      _.isUndefined(firstname) ? oldUser.first_name : firstname,
      _.isUndefined(middlename) ? oldUser.middle_name : middlename,
      _.isUndefined(lastname) ? oldUser.last_name : lastname,
      _.isUndefined(description) ? oldUser.description : description,
      _.isUndefined(active) ? oldUser.active : active,
      _.isEmpty(filePath) ? oldUser.photo : uploadImg(filePath, "photo"),
      id
    ];

    const updateResponse = await loggedQuery(req.user.id, updateUserQuery, updateValue);
    const firstRow = _.first(updateResponse);
    statusSuccess.data = {
      id: firstRow?.id_user,
      login: firstRow?.login,
      email: firstRow?.email,
      firstname: _.toString(firstRow?.first_name),
      middlename: _.toString(firstRow?.middle_name),
      lastname: _.toString(firstRow?.last_name),
      fio: [_.toString(firstRow?.last_name), _.toString(firstRow?.first_name), _.toString(firstRow?.middle_name)].join(' ').trim(),
      description: _.toString(firstRow?.description),
      active: firstRow?.active,
      photo: _.toString(firstRow?.photo),
      rights: rightsArr
    };

    if (selfUpdate) {
      statusSuccess.data["token"] = generateUserToken({
        id: firstRow.id,
        login: firstRow.login,
        email: firstRow.email,
        rights: rightsArr
      })
    }

    statusSuccess.message = dict.success.dataUpdated;
    return res.status(status.created).send(statusSuccess);
  } catch (error) {
    console.error(error);
    unlinkFiles([lxFilePath]);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

const _getDoubleLoginOrEmail = async (login, email, id) => {
  if (empty(login) && empty(email)) {
    return {};
  }
  let idQryStr = "";
  if (!empty(id)) {
    idQryStr = ` AND id_user <> ${id}`;
  }

  const checkDoubleResponse = await query(`
    SELECT id_user, (login = '${login}') as login, (email = '${email}') as email FROM users WHERE (login = '${login}' OR email = '${email}')${idQryStr} LIMIT 1;
  `);
  return doubleUser = _.first(checkDoubleResponse);
}

module.exports = {
  login,
  filters,
  read,
  create,
  update
}
