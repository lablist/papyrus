const {
  statusError,
  status
} = require("../helpers/status");
const {
  hasAllElems
} = require("../helpers/validations");
const { verify } = require("jsonwebtoken");
const { masterKey } = require("../config");

const auth = (requiredRights=[]) => {
  return (req, res, next) => {
    //Authentication
    const { token } = req.headers;
    if (!token) {
      statusError.message = "Токен не указан.";
      return res.status(status.bad).send(statusError);
    }
  
    try {
      const payload = verify(token, masterKey);

      req.user = {
        id: payload?.id,
        login: payload?.login,
        email: payload?.email,
        rights: payload?.rights
      };
    } catch (error) {
      statusError.message = "Ошибка аутентификации.";
      return res.status(status.unauthorized).send(statusError);
    }

    if (!requiredRights?.length) {
      return next();
    }

    //Authorization
    if (!hasAllElems(req.user.rights, requiredRights)) {
      statusError.message = "В доступе отказано.";
      return res.status(status.forbidden).send(statusError);
    }

    return next();
  };
};

module.exports = auth;
