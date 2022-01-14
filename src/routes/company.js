const { Router } = require("express");
const auth = require("../middleware/auth");
const rights = require("../helpers/rights");
const router = Router();

const {
  read,
  update
} = require('../controllers/company');

router.get('/read', auth([rights.administrator]), read);
router.patch('/update', auth([rights.administrator]), update);

module.exports = router;
