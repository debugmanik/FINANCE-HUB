const yahooFinance = require('yahoo-finance2').default;

/**
 * Production Stock Fetching Service (Zero-Key Version)
 * Uses yahoo-finance2 for direct market data fetching.
 */

const getStockQuote = async (symbol) => {
  try {
    const data = await yahooFinance.quote(symbol);
    return {
      price: data.regularMarketPrice || 0,
      changePercent: data.regularMarketChangePercent || 0,
      name: data.longName || symbol,
      source: 'Market (NSE)',
      status: "success"
    };
  } catch (err) {
    console.error(`[StockService] Fetch Error for ${symbol}:`, err.message);
    return {
      price: 0,
      changePercent: 0,
      name: symbol,
      source: 'Offline',
      error: 'Live data unavailable',
      status: "unavailable"
    };
  }
};

module.exports = { getStockQuote };
