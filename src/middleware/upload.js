const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { tmpDir } = require("../config");

const fileFilter = (req, file, cb) => {
  if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
    cb(null, true);
  } else {
    cb(null, false);
    console.error("Разрешены только форматы *.png, *.jpg и *.jpeg.");
  }
};

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + '.' + file.originalname.split('.').pop());
 }
});

const uploadFile = multer({ storage: fileStorage, fileFilter: fileFilter, onError: function(e, next) {
  if (e) {
    console.error(e.stack);
  }
  next();
} });

module.exports = uploadFile;
