const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const Expense = require('../models/Expense');
const User = require('../models/User');

// Helper to calculate available balance for a user
const getAvailableBalance = async (userId) => {
  const [user, expenses, investments] = await Promise.all([
    User.findById(userId),
    Expense.find({ userId }),
    Portfolio.find({ userId })
  ]);

  const income = Number(user?.monthlyIncome || 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalInvested = investments.reduce((sum, i) => sum + Number(i.totalInvested || 0), 0);

  return Number((income - totalExpenses - totalInvested).toFixed(2));
};

// GET /api/portfolio
// Get user's investment portfolio with derived valuations
router.get('/', async (req, res) => {
  try {
    const investments = await Portfolio.find({ userId: req.user.id }).sort({ date: -1 });
    
    const formattedInvestments = investments.map(inv => {
      const quantity = Number(inv.quantity || 0);
      const totalInvested = Number(inv.totalInvested || 0);
      const currentPrice = Number(inv.currentPrice || 0);

      const avgPrice = quantity > 0 ? (totalInvested / quantity) : 0;
      const effectivePrice = Number(inv.currentPrice || avgPrice || 0);
      const currentValue = quantity * effectivePrice;
      const profitLoss = currentValue - totalInvested;

      return {
        ...inv.toObject(),
        avgPrice: Number(avgPrice.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        profitLoss: Number(profitLoss.toFixed(2)),
        roi: totalInvested > 0 ? Number(((profitLoss / totalInvested) * 100).toFixed(2)) : 0
      };
    });

    const summary = formattedInvestments.reduce((acc, inv) => {
      acc.totalInvested += inv.totalInvested;
      acc.totalCurrentValue += inv.currentValue;
      return acc;
    }, { totalInvested: 0, totalCurrentValue: 0 });

    summary.totalInvested = Number(summary.totalInvested.toFixed(2));
    summary.totalCurrentValue = Number(summary.totalCurrentValue.toFixed(2));
    summary.totalPnL = Number((summary.totalCurrentValue - summary.totalInvested).toFixed(2));
    summary.roi = summary.totalInvested > 0 ? Number(((summary.totalPnL / summary.totalInvested) * 100).toFixed(2)) : 0;

    res.json({
      status: "success",
      investments: formattedInvestments,
      summary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/portfolio
// Add or merge investment holdings
router.post('/', async (req, res) => {
  try {
    const { stockName, symbol: rawSymbol, quantity: rawQty, buyPrice: rawPrice, date } = req.body;
    
    if (!stockName || !rawSymbol || !rawQty || rawPrice === undefined) {
      return res.status(400).json({ message: 'Missing required fields (Name, Symbol, Quantity, Buy Price)' });
    }

    const symbol = rawSymbol.trim().toUpperCase();
    const quantity = Number(rawQty);
    const buyPrice = Number(rawPrice);

    if (quantity <= 0 || buyPrice <= 0 || buyPrice > 10000000) {
      return res.status(400).json({ message: 'Invalid quantity or price range (0 - 1Cr)' });
    }

    const totalInvested = Number((quantity * buyPrice).toFixed(2));

    // 1. Asset Capacity Control (Max 25 UNIQUE Assets)
    const existingInvestments = await Portfolio.find({ userId: req.user.id });
    const uniqueSymbols = new Set(existingInvestments.map(i => i.symbol));
    
    if (!uniqueSymbols.has(symbol) && uniqueSymbols.size >= 25) {
      return res.status(400).json({ message: 'Portfolio capacity reached (Max 25 stocks).' });
    }

    // 2. Balance Check
    const available = await getAvailableBalance(req.user.id);
    if (totalInvested > available) {
      return res.status(400).json({ message: `Investment (₹${totalInvested}) exceeds available balance (₹${available})` });
    }

    // 3. Duplicate Merging Logic
    const existingHolding = await Portfolio.findOne({ userId: req.user.id, symbol });
    
    if (existingHolding) {
      const newQuantity = existingHolding.quantity + quantity;
      const newTotalInvested = Number((existingHolding.totalInvested + totalInvested).toFixed(2));
      
      existingHolding.quantity = newQuantity;
      existingHolding.totalInvested = newTotalInvested;
      existingHolding.currentPrice = buyPrice; // Update to latest price for valuation
      existingHolding.lastPriceUpdated = Date.now();
      existingHolding.date = date || existingHolding.date;
      
      const updatedHolding = await existingHolding.save();
      return res.status(200).json(updatedHolding);
    }

    // 4. Create new holding
    const newInvestment = new Portfolio({
      userId: req.user.id,
      stockName,
      symbol,
      quantity,
      totalInvested,
      currentPrice: buyPrice,
      lastPriceUpdated: Date.now(),
      date: date || Date.now()
    });

    const savedInvestment = await newInvestment.save();
    res.status(201).json(savedInvestment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/portfolio/:id/price
// Update current price for an asset
router.put('/:id/price', async (req, res) => {
  try {
    const { currentPrice } = req.body;
    const price = Number(currentPrice);

    if (isNaN(price) || price <= 0 || price > 10000000) {
      return res.status(400).json({ message: 'Invalid price range (0 - 1Cr)' });
    }

    const investment = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        currentPrice: Number(price.toFixed(2)), 
        lastPriceUpdated: Date.now() 
      },
      { new: true }
    );

    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    res.json(investment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/portfolio/:id
router.delete('/:id', async (req, res) => {
  try {
    const inv = await Portfolio.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!inv) {
      return res.status(404).json({ message: 'Investment not found' });
    }
    res.json({ message: 'Investment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
