
const _ = require("lodash");
const pgp = require("pg-promise")({
  capSQL: true // capitalize all generated SQL.
});
const { dbUrl } = require("../config");


const databaseConfig = {
  connectionString: dbUrl
};

const db = pgp(databaseConfig);

const query = function(query, params=[]) {
  return new Promise(async (resolve, reject) => {
    try {
      db.any(query, params)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    } catch (error) {
      reject(error);
    }
  });
}

const queryOne = function(query, params=[]) {
  return new Promise(async (resolve, reject) => {
    try {
      db.one(query, params)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    } catch (error) {
      reject(error);
    }
  });
}

const loggedQuery = function(userId, quertText, params) {
  return new Promise(async (resolve, reject) => {
    try {
      const cb = async (t, mainQueryResponse) => {
        if (!_.isEmpty(mainQueryResponse)) {
          let createLogQuery = `INSERT INTO changelog (change_seq_id, user_id)
          VALUES  `;
          for (const mainQueryRow of mainQueryResponse) {
            const changeSeqId = _.get(mainQueryRow, "change_seq_id", false);
            if (changeSeqId !== false) {
              createLogQuery = createLogQuery + `(${changeSeqId}, ${userId}), `
            }
          }
          createLogQuery = `${createLogQuery.slice(0, -2)};`;
          if (createLogQuery.length > 65) {
            return t.any(createLogQuery).then(()=> {
              return mainQueryResponse
            }); 
          }
          return mainQueryResponse
        }
      }
      db.task(t => {
        return t.any(quertText, params).then((mainQueryResponse)=>cb(t, mainQueryResponse));    
      }).then(data => {
        resolve(data);
      }).catch(error => {
        reject(error);
      });
    } catch (error) {
      reject(err);
    }
  });
}

module.exports = {
  pgp,
  db,
  queryOne,
  query,
  loggedQuery
};
