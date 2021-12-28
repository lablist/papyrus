const status = {
  success: 200,
  created: 201,
  nocontent: 204,
  bad: 400,
  unauthorized: 401,
  forbidden: 403,
  notfound: 404,
  conflict: 409,
  error: 500,
};

const statusSuccess = {
  status: "success",
  data: {},
  message: ""
};

const statusError = {
  status: "error",
  message: ""
};

module.exports = {
  status,
  statusSuccess,
  statusError
};
