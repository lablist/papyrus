const { Router } = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const rights = require("../helpers/rights");
const router = Router();

const {
  filters,
  create,
  read,
  update
} = require('../controllers/directions');

router.post('/filters', auth([rights.administrator]), filters);
router.put('/create', auth([rights.administrator]), upload.single('photo'), create);
router.get('/read', auth([rights.administrator]), read);
router.patch('/update', auth([rights.administrator]), upload.single('photo'), update);

module.exports = router;
