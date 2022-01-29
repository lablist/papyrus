const _ = require("lodash");
const { v4: uuidv4 } = require("uuid");
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
const {
  unlinkFiles,
  getImagePath
} = require("../helpers/files");

const dict = {
  success: {
    received: "Данные получены.",
    updated: "Данные обновлены.",
    deleted: "Данные удалены."
  },
  errors: {
    unknown: "Неизвестная ошибка.",
    empty: "Пустой параметр.",
    root: "Не удаляйте корневой каталог."
  }
}

const _getDTree = async () => {
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
      dt.direction_name as direction_type_name,
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
    return {ok: true, data: dbResponse}
  } catch (error) {
    return {ok: false, data: error}
  }
}

const read = async (req, res) => {
  const dTree = await _getDTree();

  if (!dTree.ok) {
    console.error(dTree.data);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }

  statusSuccess.data = dTree.data;
  statusSuccess.message = dict.success.received;
  return res.status(status.success).send(statusSuccess);
}

const update = async (req, res) => {
  const {
    directions=[],
    id="",
    isParentId=false
  } = req.body;

  if (notFilledArray(directions)) {
    statusError.message = dict.errors.empty;
    return res.status(status.bad).send(statusError);
  }

  try {
    const updateQuery = `
      UPDATE 
        directions 
      SET
        rate = subquery.rate,
        active = subquery.active,
        direction_name = subquery.direction_name,
        human_name = subquery.human_name,
        direction_type_id = subquery.direction_type_id,
        site_description = subquery.site_description,
        site_keywords = subquery.site_keywords,
        site_title = subquery.site_title,
        change_seq_id = subquery.change_seq_id
      FROM
        (select x.*, nextval('id_change'::regclass) as change_seq_id
        from json_to_recordset('${JSON.stringify(_.map(directions, (i) => ({
          id_direction: i.id_direction,
          rate: i.rate,
          active: i.active,
          direction_name: i.direction_name,
          human_name: i.human_name,
          direction_type_id: i.direction_type_id,
          site_description: i.site_description,
          site_keywords: i.site_keywords,
          site_title: i.site_title
        })))}')
        as x("id_direction" int, "rate" int, "active" boolean, "direction_name" text, "human_name" text, "direction_type_id" int, "site_description" text, "site_keywords" text, "site_title" text)) AS subquery
      WHERE 
        directions.id_direction = subquery.id_direction returning *;
    `;
    const updateResponse = await loggedQuery(req.user.id, updateQuery);

    if (!notFilledString(id) && !isParentId) {
      const getParentDirections = `
        SELECT 
          d.id_direction,
          d.parent_id,
          d.direction_name,
          d.human_name,
          d.rate
        FROM
          (SELECT sd.parent_id FROM directions sd WHERE sd.id_direction = ${id}) idd,
          directions d
        WHERE
          d.parent_id = idd.parent_id
        ORDER BY d.rate;`;

      const parentDirections = await query(getParentDirections);
      const parentDirection = parentDirections.find((i)=>(i.id_direction == id));
      const parentDirectionIndex = parentDirections.findIndex((i)=>(i.id_direction == id));
      const newDirectionRates = parentDirections.map((i, index)=>({
        id_direction: i.id_direction,
        rate: parentDirectionIndex >= index ? i.rate : i.rate + 1
      }));
      const directionUUIDv4 = uuidv4();

      await loggedQuery(req.user.id, `
        INSERT INTO directions (
          parent_id,
          direction_name,
          human_name,
          rate
        )
        VALUES (${parentDirection.parent_id}, 'new-${directionUUIDv4}', 'new-${directionUUIDv4}', ${parentDirection.rate + 1}) returning *;
      `);

      await loggedQuery(req.user.id, `
        UPDATE
          directions
        SET
          rate = subquery.rate,
          change_seq_id = subquery.change_seq_id
        FROM
          (select x.*, nextval('id_change'::regclass) as change_seq_id
          from json_to_recordset('${JSON.stringify(_.map(newDirectionRates, (i) => ({
            id_direction: i.id_direction,
            rate: i.rate
          })))}')
          as x("id_direction" int, "rate" int)) AS subquery
        WHERE 
          directions.id_direction = subquery.id_direction returning *;
      `);
    }

    if (!notFilledString(id) && isParentId) {
      const getRate = `SELECT (coalesce(MAX(rate),  0) + 1) as nextRate FROM directions WHERE parent_id = ${id}`;
      const { nextrate } = await queryOne(getRate);
      const directionUUIDv4 = uuidv4();

      await loggedQuery(req.user.id, `
        INSERT INTO directions (
          parent_id,
          direction_name,
          human_name,
          rate
        )
        VALUES (${id}, 'new-${directionUUIDv4}', 'new-${directionUUIDv4}', ${nextrate}) returning *;
      `);
    }

    statusSuccess.data = updateResponse;
    statusSuccess.message = dict.success.updated;
    return res.status(status.created).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

const remove = async (req, res) => {
  const {
    id
  } = req.query;

  if (id == 1) {
    statusError.message = dict.errors.root;
    return res.status(status.bad).send(statusError);
  }

  if (empty(id)) {
    statusError.message = dict.errors.empty;
    return res.status(status.bad).send(statusError);
  }

  try {
    const getIDsQuery = `
      WITH RECURSIVE nodes(id_direction) AS (
        SELECT d1.id_direction, d1.page_id FROM directions d1 WHERE d1.id_direction=${id}
        UNION
        SELECT d2.id_direction, d2.page_id FROM directions d2, nodes ns WHERE d2.parent_id = ns.id_direction
      )
      SELECT *, p.page_photo FROM nodes n
      LEFT JOIN pages p ON p.id_page = n.page_id;
    `;
    const ids = await query(getIDsQuery);
    const directionIDs = ids.map((i)=>(i?.id_direction))
    const pages = ids.map((i)=>({id: i?.page_id, photo: i?.page_photo})).filter((i)=>(!!i?.id));

    if (!notFilledArray(ids)) {
      const removeDirectionsQuery = `
      DELETE FROM directions WHERE id_direction = ANY(ARRAY[${directionIDs}]);

      UPDATE directions
      SET rate = subquery.rate
      FROM (
        SELECT 
          sd.id_direction,
          row_number() over ( order by sd.rate ) as rate
        FROM 
          directions sd
      ) AS subquery
      WHERE directions.id_direction = subquery.id_direction;`;
      await query(removeDirectionsQuery);
    }

    const pageIds = pages.map((i)=>i.id);
    if (!notFilledArray(pageIds)) {
      await query(`DELETE FROM pages WHERE id_page = ANY(ARRAY[${pageIds}]);`);
    }

    const photoPaths = pages.map((i)=>getImagePath(i.photo));
    unlinkFiles(photoPaths);

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
  _getDTree,
  read,
  update,
  remove
}
