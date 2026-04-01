const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// GET /expenses
router.get('/', expenseController.getExpenses);

// POST /expenses
router.post('/', expenseController.createExpense);

// PUT /expenses/:id
router.put('/:id', expenseController.updateExpense);

// DELETE /expenses/:id
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
