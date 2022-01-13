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
app.use(express.json());
app.use(cors());
// TODO: app.use(cors({origin: "https://www.my.site/"}));

// app.use(helmet());
// app.use(helmet.hidePoweredBy());

app.use(express.urlencoded({
  extended: true
}));

routes(app);

app.listen(port).on("listening", () => {
  console.info(`App runs on port: ${port}`);
});
