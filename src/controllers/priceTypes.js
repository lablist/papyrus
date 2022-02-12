const _ = require("lodash");
const { query, loggedQuery, queryOne } = require("../database");
const {
  empty,
  notFilledArray
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

const _getPriceTypes = async () => {
  try {
    const getQuery = `
      SELECT
        pt.id_price_type as id,
        coalesce(pt.price_type_name, '') as name
      FROM
        price_types pt
      ORDER BY pt.rate;
    `;
    const dbResponse = await query(getQuery);
    return {ok: true, data: dbResponse}
  } catch (error) {
    return {ok: false, data: error}
  }
}

const read = async (req, res) => {
  const priceTypes = await _getPriceTypes();
  if (!priceTypes.ok) {
    console.error(priceTypes.data);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }

  statusSuccess.data = priceTypes.data;
  statusSuccess.message = dict.success.dataReceived;
  return res.status(status.success).send(statusSuccess);
}

const create = async (req, res) => {
  const { name } = req.body;

  if (empty(name)) {
    statusError.message = dict.errors.empty;
    return res.status(status.bad).send(statusError);
  }

  const createQuery = `
    INSERT INTO price_types (
      price_type_name,
      rate
    )
    VALUES ($1, $2)
    returning *;
  `;

  try {
    const getRate = `SELECT (coalesce(MAX(rate),  0) + 1) as nextRate FROM price_types;`;
    const { nextrate } = await queryOne(getRate);
  
    const dbResponse = await loggedQuery(req.user.id, createQuery, [name, nextrate]);
    const firstRow = _.first(dbResponse);

    statusSuccess.data = {
      id: firstRow?.id_price_type,
      name: firstRow?.price_type_name
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
  const { priceTypes=[] } = req.body;

  if (notFilledArray(priceTypes)) {
    statusError.message = dict.errors.empty;
    return res.status(status.bad).send(statusError);
  }

  try {
    const updateQuery = `
      UPDATE
        price_types
      SET
        id_price_type = subquery.id_price_type,
        price_type_name = subquery.price_type_name,
        rate = subquery.rate,
        change_seq_id = subquery.change_seq_id
      FROM
        (select x.*, nextval('id_change'::regclass) as change_seq_id
        from json_to_recordset('${JSON.stringify(_.map(priceTypes, (i) => ({
          id_price_type: i.id,
          price_type_name: i.name,
          rate: i.rate
        })))}')
        as x("id_price_type" int, "price_type_name" text, "rate" int)) AS subquery
      WHERE
        price_types.id_price_type = subquery.id_price_type returning *;
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
      DELETE FROM prices WHERE price_type_id = ${id};
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

      DELETE FROM price_types WHERE id_price = ${id};
      UPDATE price_types
      SET rate = subquery.rate
      FROM (
        SELECT 
          pt.id_price_type,
          row_number() over ( order by pt.rate ) as rate
        FROM 
          price_types pt
      ) AS subquery
      WHERE price_types.id_price_type = subquery.id_price_type;
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
  _getPriceTypes,
  create,
  read,
  update,
  remove
}
