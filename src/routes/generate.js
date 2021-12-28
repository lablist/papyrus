const { Router } = require("express");
const auth = require("../middleware/auth");
const rights = require("../helpers/rights");
const {
  home
} = require('../controllers/public');
const {all} = require("../controllers/generate");
const router = Router();

router.get('/', home);
router.get('/all', auth([rights.administrator]), all);

module.exports = router;
