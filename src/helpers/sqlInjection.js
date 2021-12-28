// sql regex reference: http://www.symantec.com/connect/articles/detection-sql-injection-and-cross-site-scripting-attacks
const sqlMeta = new RegExp('(%27)|(\')|(--)|(%23)|(#)', 'i');
const sqlMeta2 = new RegExp('((%3D)|(=))[^\n]*((%27)|(\')|(--)|(%3B)|(;))', 'i');
const sqlTypical = new RegExp('w*((%27)|(\'))((%6F)|o|(%4F))((%72)|r|(%52))', 'i');
const sqlUnion = new RegExp('((%27)|(\'))union', 'i');

function sqlInjection(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (sqlMeta.test(value)) {
    return true;
  }

  if (sqlMeta2.test(value)) {
    return true;
  }

  if (sqlTypical.test(value)) {
    return true;
  }

  if (sqlUnion.test(value)) {
    return true;
  }

  return false;
}

module.exports = sqlInjection;
