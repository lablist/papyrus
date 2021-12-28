const {
  isEmpty,
  forOwn,
  head,
  last
} = require("lodash");

const getOrderStr = (field, reversed=false, colNames) => {
  if (isEmpty(field) || isEmpty(colNames) ) {
    return ' ';
  }
  return ` ORDER BY ${colNames[field]} ${(reversed ? 'DESC' : 'ASC')}`;
}

const getLimitStr = (page=1, limit=10) => {
  return ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
}

const getWhereStr = (filters={}, colNames, before='') => {
  if (isEmpty(filters) || isEmpty(colNames) ) {
    return `${before}`.slice(0,-3);
  }

  let whereStr = ` ${isEmpty(before) ? 'WHERE' : before}`;
  forOwn(filters, ({operator, value}, colName) => {
    if (operator === '=' && !isEmpty(value)) {
      whereStr += ` ${colNames[colName]} = ${value} AND`
    };

    if (operator === 'in' && !isEmpty(value)) {
      whereStr += ` ${colNames[colName]} = ANY(ARRAY[${value}]) AND`
    };

    if (operator === 'ilike' && !isEmpty(value)) {
      whereStr += ` ${colNames[colName]} ILIKE '%${value}%' AND`
    };

    if (operator === 'isnotnull') {
      whereStr += ` ${colNames[colName]} is not null AND`
    };

    if (operator === 'isnull') {
      whereStr += ` ${colNames[colName]} is null AND`
    };

    if (operator === 'between') {
      whereStr += ` ${colNames[colName]} between '${head(value)}' and '${last(value)}' AND`
    };
  });
  return whereStr.slice(0,-3);
}

module.exports = {
  getOrderStr,
  getLimitStr,
  getWhereStr
};
