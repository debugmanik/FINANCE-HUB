const express = require('express');
const router = express.Router();
const stocks = require('../data/stocks.json');
const { getStockQuote } = require('../services/stockService');

/**
 * CACHE GOVERNANCE (100-entry limit + TTL)
 * Only quotes are cached now.
 */
const quoteCache = {};
const MAX_CACHE_ENTRIES = 100;

const manageCacheSize = (cache) => {
  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHE_ENTRIES) {
    // Evict oldest entry
    const oldestKey = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
    delete cache[oldestKey];
  }
};

// GET /api/stock/search?q=query
router.get("/search", (req, res) => {
  const query = req.query.q?.toLowerCase().trim();

  if (!query || query.length < 2) {
    return res.json([]);
  }

  const results = stocks
    .filter(stock =>
      stock.name.toLowerCase().includes(query) ||
      stock.symbol.toLowerCase().includes(query)
    )
    .slice(0, 8);

  res.json(results);
});

// GET /api/stock/quote?symbol=symbol
router.get('/quote', async (req, res) => {
  try {
    let symbol = (req.query.symbol || '').trim().toUpperCase();
    if (!symbol) return res.status(400).json({ message: 'Symbol required' });

    // Symbol Guard: Append .NS if missing and no other suffix exists
    if (!symbol.includes('.')) {
      symbol += '.NS';
    }

    // Check Cache
    const cached = quoteCache[symbol];
    if (cached && Date.now() - cached.timestamp < 15000) { // 15s TTL
      return res.json(cached.data);
    }

    const quote = await getStockQuote(symbol);

    // Save to Cache
    quoteCache[symbol] = { data: quote, timestamp: Date.now() };
    manageCacheSize(quoteCache);

    res.json(quote);
  } catch (err) {
    console.error('[StockRoute] Quote error:', err.message);
    res.json({ status: 'unavailable', error: 'System error' });
  }
});

module.exports = router;
