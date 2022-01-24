const { Router } = require("express");
const auth = require("../middleware/auth");
const rights = require("../helpers/rights");
const router = Router();

const {
  read
} = require('../controllers/directionsTypes');

router.get('/read', auth([rights.administrator]), read);

module.exports = router;
