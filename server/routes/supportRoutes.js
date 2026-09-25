const express = require('express');
const router = express.Router();
const {
  getFPOs,
  getKisanGroups,
  getHelpline,
} = require('../controllers/supportController');

router.get('/fpos', getFPOs);
router.get('/kisan-groups', getKisanGroups);
router.get('/helpline', getHelpline);

module.exports = router;
