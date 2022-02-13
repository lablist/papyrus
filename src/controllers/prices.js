const _ = require("lodash");
const { query, loggedQuery, queryOne } = require("../database");
const {
  empty,
  notFilledArray,
  notFilledString
} = require("../helpers/validations");

const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");

const dict = {
  success: {
    dataReceived: "Данные получены.",
    dataUpdated: "Данные обновлены.",
    dataAdded: "Данные добавлены."
  },
  errors: {
    empty: "Пустой параметр.",
    unknown: "Неизвестная ошибка.",
  }
}

const _getPrices = async () => {
  try {
    const getQuery = `
      SELECT
        p.id_price as id,
        coalesce(p.code_price, '') as code,
        coalesce(p.name_price, '') as name,
        p.value_price as price,
        p.price_type_id as typeid,
        pt.price_type_name as typename,
        p.rate
      FROM
        prices p
      LEFT JOIN price_types pt ON pt.id_price_type = p.price_type_id
      ORDER BY p.rate;
    `;
    const dbResponse = await query(getQuery);
    return {ok: true, data: dbResponse}
  } catch (error) {
    return {ok: false, data: error}
  }
}

const read = async (req, res) => {
  const prices = await _getPrices();
  if (!prices.ok) {
    console.error(prices.data);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }

  statusSuccess.data = prices.data;
  statusSuccess.message = dict.success.dataReceived;
  return res.status(status.success).send(statusSuccess);
}

const create = async (req, res) => {
  const {
    code="",
    name="",
    price="0",
    typeid
   } = req.body;

  if (notFilledString(code) || notFilledString(name)) {
    statusError.message = dict.errors.empty;
    return res.status(status.bad).send(statusError);
  }

  const createQuery = `
    INSERT INTO prices (
      code_price,
      name_price,
      value_price,
      price_type_id,
      rate
    )
    VALUES ($1, $2, $3, $4, $5)
    returning *;
  `;

  try {
    const getRate = `SELECT (coalesce(MAX(rate),  0) + 1) as nextRate FROM prices;`;
    const { nextrate } = await queryOne(getRate);
  
    const dbResponse = await loggedQuery(req.user.id, createQuery, [code, name, price, _.toNumber(typeid, 0), nextrate]);
    const firstRow = _.first(dbResponse);

    statusSuccess.data = {
      id: firstRow?.id_price,
      code: firstRow?.code_price,
      name: firstRow?.name_price,
      price: firstRow?.value_price,
      typeid: firstRow?.price_type_id,
      rate: firstRow?.rate
    };

    statusSuccess.message = dict.success.dataAdded;
    return res.status(status.created).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
};

const update = async (req, res) => {
  const { prices=[] } = req.body;

  if (notFilledArray(prices)) {
    statusError.message = dict.errors.empty;
    return res.status(status.bad).send(statusError);
  }

  try {
    const updateQuery = `
      UPDATE
        prices
      SET
        id_price = subquery.id_price,
        code_price = subquery.code_price,
        name_price = subquery.name_price,
        value_price = subquery.value_price,
        price_type_id = subquery.price_type_id,
        rate = subquery.rate,
        change_seq_id = subquery.change_seq_id
      FROM
        (select x.*, nextval('id_change'::regclass) as change_seq_id
        from json_to_recordset('${JSON.stringify(_.map(prices, (i) => ({
          id_price: i.id,
          code_price: i.code,
          name_price: i.name,
          value_price: i.price,
          price_type_id: i.typeid,
          rate: i.rate
        })))}')
        as x("id_price" int, "code_price" text, "name_price" text, "value_price" int, "price_type_id" int, "rate" int)) AS subquery
      WHERE
        prices.id_price = subquery.id_price returning *;
    `;
    const updateResponse = await loggedQuery(req.user.id, updateQuery);
    statusSuccess.data = updateResponse
    statusSuccess.message = dict.success.dataUpdated;
    return res.status(status.created).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

const remove = async (req, res) => {
  const { id } = req.query;

  if (empty(id)) {
    statusError.message = dict.errors.empty;
    return res.status(status.bad).send(statusError);
  }

  try {
    const removeQuery = `
      DELETE FROM prices WHERE id_price = ${id};
      UPDATE prices
      SET rate = subquery.rate
      FROM (
        SELECT 
          p.id_price,
          row_number() over ( order by p.rate ) as rate
        FROM 
          prices p
      ) AS subquery
      WHERE prices.id_price = subquery.id_price;
    `;
    await query(removeQuery);
    statusSuccess.data = {};
    statusSuccess.message = dict.success.deleted;
    return res.status(status.created).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
};

module.exports = {
  _getPrices,
  create,
  read,
  update,
  remove
}
