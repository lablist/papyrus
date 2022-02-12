const { Router } = require("express");
const auth = require("../middleware/auth");
const rights = require("../helpers/rights");
const router = Router();
const {
  getDump
} = require('../controllers/backup');

router.get('/dump', auth([rights.administrator]), getDump);

module.exports = router;
