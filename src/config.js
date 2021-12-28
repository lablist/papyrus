const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  environment: process.env.NODE_ENV,
  port: process.env.PORT || 8626,
  masterKey: process.env.SECRET,
  dbUrl: process.env.DB_URL,
  tmpDir: process.env.TMP_DIR || 'tmp/'
};
