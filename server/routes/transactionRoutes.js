const express = require('express');
const router = express.Router();
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransactionStatus,
} = require('../controllers/transactionController');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/', protect, restrictTo('farmer', 'seller', 'admin'), createTransaction);
router.get('/', protect, getTransactions);
router.get('/:id', protect, getTransactionById);
router.put('/:id/status', protect, updateTransactionStatus);

module.exports = router;
