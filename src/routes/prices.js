const { Router } = require("express");
const auth = require("../middleware/auth");
const rights = require("../helpers/rights");
const router = Router();

const {
  create,
  read,
  update,
  remove
} = require('../controllers/prices');

router.put('/create', auth([rights.administrator]), create);
router.get('/read', auth([rights.administrator]), read);
router.post('/update', auth([rights.administrator]), update);
router.delete('/delete', auth([rights.administrator]), remove);

module.exports = router;
