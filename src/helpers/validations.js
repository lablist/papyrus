const { sign } = require("jsonwebtoken");
const {
  genSaltSync,
  hashSync,
  compareSync
} = require("bcrypt");
const {
  isEmpty,
  isNull,
  toString
} = require("lodash");
const { masterKey } = require("../config");

const saltRounds = 8;
const salt = genSaltSync(saltRounds);

const hashPassword = password => hashSync(password, salt);
const comparePassword = (password, hashedPassword) => {
  return compareSync(password, hashedPassword);
};

/**
 * At least eight characters, at least one uppercase letter, one lowercase letter and one number: 
 * /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/
 */
const validatePasswordRegExp = new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/);
const validatePassword = (password) => validatePasswordRegExp.test(password);

/**
 * Synchronous Sign with default (HMAC SHA256), 
 * with RSA SHA256 jwt.sign({}, privateKey, { algorithm: 'RS256' }).
 * expiresIn: 900000 = 900000ms, 1d, 1h.
 * 15 Minutes = 900000
 */
 const generateUserToken = (user) => {
  const token = sign(
    {
      id: user.id,
      login: user.login,
      email: user.email,
      rights: user.rights
    },
    masterKey,
    {
      expiresIn: '1d'
    }
  );
  return token;
};

const isValidEmail = (email) => {
  const regEx = /\S+@\S+\.\S+/;
  return regEx.test(email);
};

const empty = (text) => {
  if (text === undefined || text === '') {
    return true;
  }
  if (toString(text).replace(/ /g, '').length) {
    return false;
  } return true;
};

const hasAllElems = (someArr, requestedArr) => {
  return requestedArr.every(r=> someArr.indexOf(r) >= 0)
};

const noNull = (val, alternative=undefined) => {
  if (isNull(val) || (toString(val).toLowerCase() === 'null')) {
    return alternative;
  }
  return val
}

const noEmptyStr = (val, alternative=undefined) => {
  if (isEmpty(toString(val))) {
    return alternative;
  }
  return val
}

const notFilledString = (v)=> (typeof v !== "string" || (typeof v === "string" && v.length === 0));
const notFilledArray = (v)=> (!Array.isArray(v) || (Array.isArray(v)  && v.length === 0));

module.exports = {
  hashPassword,
  comparePassword,
  isValidEmail,
  validatePassword,
  empty,
  generateUserToken,
  hasAllElems,
  noNull,
  noEmptyStr,
  notFilledString,
  notFilledArray
};
