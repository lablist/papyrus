const {
  existsSync,
  mkdirSync
} = require("fs");
const helmet = require("helmet");
const express = require("express");
const cors = require("cors");
const { port, tmpDir } = require("./config");
const routes = require("./routes");

if (!existsSync(tmpDir)) {
  mkdirSync(tmpDir);
}

const app = express();

app.use(cors());
//app.use(cors({origin: "https://www.dentex-sl.ru"}));

app.use(helmet());
app.use(helmet.hidePoweredBy());

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({
  extended: true,
  limit: '100mb',
  parameterLimit: 100000
}));

// testing:
//app.use("/adm", express.static(__dirname + "/public/adm"));
//app.use("/assets", express.static(__dirname + "/public/assets"));

routes(app);

app.listen(port).on("listening", () => {
  console.info(`App runs on port: ${port}`);
});
