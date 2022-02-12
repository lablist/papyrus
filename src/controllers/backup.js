const {
  existsSync,
  mkdirSync
} = require("fs");
const spawn = require("child_process").spawn;
const resolve = require("path").resolve;
const { dbDump } = require("../config");
const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");

const dict = {
  success: {
    created: "ok",
  },
  errors: {
    unknown: "Неизвестная ошибка.",
  }
}

const appPath = resolve();

const getDump = async (req, res) => {
  let pgDumpChild = null;
  const dumpFilePath = resolve("./pg-backup.tar");

  try {
    pgDumpChild = spawn("pg_dump", dbDump.split(" "), {stdio: ["ignore", "pipe", "inherit"]});
    pgDumpChild.on('error', function (code) {
      console.error(code);
      statusError.message = dict.errors.unknown;
      return res.status(status.error).send(statusError);
    })
    pgDumpChild.on('exit', function (code) {
      console.error(code);
      statusError.message = dict.errors.unknown;
      return res.status(status.error).send(statusError);
    });
    pgDumpChild.on("close", (code, signal) => {
      return res.status(status.success).sendFile(dumpFilePath);
    });
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

module.exports = {
  getDump
}
