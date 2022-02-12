const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  environment: process.env.NODE_ENV,
  port: process.env.PORT,
  masterKey: process.env.SECRET,
  dbUrl: process.env.DB_URL,
  dbDump: process.env.DB_DUMP,
  tmpDir: process.env.TMP_DIR,
  apiDir: process.env.API_DIR
};
