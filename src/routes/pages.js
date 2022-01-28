const { Router } = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const rights = require("../helpers/rights");
const router = Router();

const {
  create,
  read,
  update
} = require('../controllers/pages');

router.put('/create', auth([rights.administrator]), create);
router.get('/read', auth([rights.administrator]), read);
router.post('/update', auth([rights.administrator]), upload.single('page'), update);

module.exports = router;
