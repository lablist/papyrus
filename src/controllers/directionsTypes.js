const _ = require("lodash");
const { query } = require("../database");
const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");

const dict = {
  success: {
    dataReceived: "Данные получены.",
  },
  errors: {
    unknown: "Неизвестная ошибка.",
  }
}

const read = async (req, res) => {
  try {
    const getQuery = `
    SELECT 
      dt.id_direction_type as id, 
      dt.direction_name as name
    FROM 
      directions_types dt;
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

module.exports = {
  read
}
