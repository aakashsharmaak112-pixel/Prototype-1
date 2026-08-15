// ============================================
// PROTOTYPE-1
// MARKET DATA API
// api/market-data.js
// ============================================

const QUOTES_URL =
  "https://prototype-1-rho-silk.vercel.app/api/quotes";

function send(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  // --------------------------------------------
  // METHOD
  // --------------------------------------------

  if (req.method !== "GET") {
    return send(res, 405, {
      success: false,
      error: "Use GET method."
    });
  }

  try {
    // ------------------------------------------
    // GET KOTAK NEO QUOTES
    // ------------------------------------------

    const response = await fetch(QUOTES_URL, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const data = await response.json();

    // ------------------------------------------
    // QUOTES API ERROR
    // ------------------------------------------

    if (!response.ok || !data.success) {
      return send(res, 502, {
        success: false,
        step: "QUOTES_API",
        error: "Quotes API failed.",
        quoteResponse: data
      });
    }

    // ------------------------------------------
    // VALIDATE STOCK DATA
    // ------------------------------------------

    if (!Array.isArray(data.stocks)) {
      return send(res, 502, {
        success: false,
        step: "MARKET_DATA",
        error: "stocks array missing."
      });
    }

    // ------------------------------------------
    // CLEAN MARKET DATA
    // ------------------------------------------

    const stocks = data.stocks
      .filter(stock => stock.success)
      .map((stock, index) => {
        const ltp = Number(stock.ltp);
        const change = Number(stock.change);
        const perChange = Number(stock.perChange);

        return {
          rank: index + 1,

          symbol: stock.symbol,
          token: stock.token,

          exchange: stock.exchange,
          displaySymbol: stock.displaySymbol,

          ltp: Number.isFinite(ltp) ? ltp : 0,
          change: Number.isFinite(change) ? change : 0,
          perChange: Number.isFinite(perChange)
            ? perChange
            : 0,

          open: Number(stock.open) || 0,
          high: Number(stock.high) || 0,
          low: Number(stock.low) || 0,
          close: Number(stock.close) || 0,

          yearHigh: Number(stock.yearHigh) || 0,
          yearLow: Number(stock.yearLow) || 0,

          lastTradedQuantity:
            Number(stock.lastTradedQuantity) || 0,

          avgCost:
            Number(stock.avgCost) || 0,

          lastUpdated:
            stock.lastUpdated || null
        };
      });

    // ------------------------------------------
    // SORT BY % CHANGE
    // ------------------------------------------

    const sortedByChange = [...stocks].sort(
      (a, b) => b.perChange - a.perChange
    );

    // ------------------------------------------
    // TOP 20
    // ------------------------------------------

    const top20 = sortedByChange
      .slice(0, 20)
      .map((stock, index) => ({
        ...stock,
        rank: index + 1
      }));

    // ------------------------------------------
    // MARKET SUMMARY
    // ------------------------------------------

    const gainers = stocks.filter(
      stock => stock.perChange > 0
    ).length;

    const losers = stocks.filter(
      stock => stock.perChange < 0
    ).length;

    const unchanged = stocks.filter(
      stock => stock.perChange === 0
    ).length;

    // ------------------------------------------
    // FINAL RESPONSE
    // ------------------------------------------

    return send(res, 200, {
      success: true,

      step: "MARKET_DATA_SUCCESS",

      source: "KOTAK NEO",

      totalStocks: stocks.length,

      expectedStocks: 50,

      complete:
        stocks.length === 50,

      marketSummary: {
        gainers,
        losers,
        unchanged
      },

      top20,

      stocks,

      fetchedAt:
        new Date().toISOString()
    });

  } catch (error) {

    return send(res, 502, {
      success: false,

      step: "MARKET_DATA_FAILED",

      error:
        error?.message ||
        String(error)
    });
  }
}
