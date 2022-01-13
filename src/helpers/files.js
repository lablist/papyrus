const {
  isEmpty,
  isObject,
  isString
} = require("lodash");
const {
  resolve,
  parse
} = require("path");
const {
  unlink,
  existsSync,
  copyFile,
  mkdirSync
} = require("fs");
const appPath = resolve();
const imgSavePath = "src/public/assets/img";

const unlinkFiles = (paths=[]) => {
  if (isEmpty(paths)) {
    return;
  }
  try {
    const unlinkcb = (error, filePath) => {
      if (error) {
        console.error("File deletion error:", filePath, error);
        return;
      }
      console.info("File deleted successfully:", filePath);
    }

    for (const singlePath of paths) {
      const filePath = resolve(singlePath);
      if (filePath === appPath) {
        return;
      }
      if (existsSync(filePath)) {
        unlink(filePath, (error)=>{unlinkcb(error, filePath)})
      } else {
        console.error("File don't exist:", filePath);
      }
    }
  } catch (error) {
    console.error("Error in unlinkFiles:", paths, error);
  }
}

const uploadImg = (filePath, subFolderName="") => {
  try {
    const destPath = `${imgSavePath}/${subFolderName}`;
    if (!existsSync(destPath)) {
      mkdirSync(destPath);
    }

    const oldFilePath = resolve(filePath);
    const fileName = parse(filePath).base;

    const newFilePath = resolve(destPath);
    const newFullFilePath = `${newFilePath}/${fileName}`;

    copyFile(oldFilePath, newFullFilePath, (err) => {
      if (err) {
        console.error("Failed to copy file:", filePath, "");
        unlinkFiles([filePath]);
        return "";
      }
      unlinkFiles([filePath]);
      console.info("File was copied to destination");
    });
    return `${subFolderName}${subFolderName.length === 0 ? "" : "/"}${fileName}`;
  } catch (error) {
    unlinkFiles([filePath]);
    console.error("Error in uploadImg:", filePath, error);
  }
}

module.exports = {
  unlinkFiles,
  uploadImg
};
