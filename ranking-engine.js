// ============================================
// PROTOTYPE-1
// LIVE MARKET RANKING ENGINE
// ============================================

const RANKING_ENGINE = {

  name: "Prototype-1 Ranking Engine",

  version: "1.0",

  targetStocks: 20,


  // ==========================================
  // CALCULATE STOCK SCORE
  // ==========================================

  calculateScore: function (stock) {

    if (!stock) {
      return 0;
    }

    const change =
      Number(
        stock.change ??
        stock.perChange ??
        0
      ) || 0;

    const price =
      Number(
        stock.price ??
        stock.ltp ??
        0
      ) || 0;


    if (price <= 0) {
      return -999999;
    }


    // Current prototype ranking:
    // percentage change = primary score

    return change;
  },


  // ==========================================
  // RANK MARKET DATA
  // ==========================================

  rank: function (marketData) {

    if (!marketData) {
      return [];
    }


    const stocks = Array.isArray(marketData)
      ? marketData
      : Object.values(marketData);


    const ranked = [];


    stocks.forEach(function (stock) {

      if (!stock) {
        return;
      }


      const symbol =
        String(
          stock.symbol || ""
        )
          .replace(/-EQ$/i, "")
          .trim()
          .toUpperCase();


      if (!symbol) {
        return;
      }


      const price =
        Number(
          stock.price ??
          stock.ltp ??
          0
        ) || 0;


      if (price <= 0) {
        return;
      }


      const change =
        Number(
          stock.change ??
          stock.perChange ??
          0
        ) || 0;


      const score =
        this.calculateScore(stock);


      ranked.push({

        symbol: symbol,

        name:
          stock.name ||
          symbol,

        sector:
          stock.sector ||
          "Market",

        price: price,

        ltp:
          Number(
            stock.ltp ??
            price
          ) || price,

        change: change,

        perChange:
          Number(
            stock.perChange ??
            change
          ) || change,

        score: score,

        token:
          stock.token || null,

        exchange:
          stock.exchange || "nse_cm",

        displaySymbol:
          stock.displaySymbol ||
          `${symbol}-EQ`

      });

    }, this);


    // ========================================
    // SORT HIGHEST SCORE FIRST
    // ========================================

    ranked.sort(function (a, b) {

      return b.score - a.score;

    });


    return ranked;
  },


  // ==========================================
  // GET TOP 20
  // ==========================================

  getTop20: function (marketData) {

    const ranked =
      this.rank(marketData);


    return ranked.slice(
      0,
      this.targetStocks
    );
  },


  // ==========================================
  // GET TOP STOCK
  // ==========================================

  getTopStock: function (marketData) {

    const top20 =
      this.getTop20(marketData);


    return top20.length
      ? top20[0]
      : null;
  },


  // ==========================================
  // ENGINE STATUS
  // ==========================================

  getStatus: function () {

    return {

      name:
        this.name,

      version:
        this.version,

      targetStocks:
        this.targetStocks,

      ready:
        true

    };
  }

};


// ============================================
// GLOBAL ACCESS
// ============================================

window.RANKING_ENGINE =
  RANKING_ENGINE;


// ============================================
// COMPATIBILITY FUNCTIONS
// ============================================

window.calculateStockScore =
  function (stock) {

    return RANKING_ENGINE.calculateScore(
      stock
    );

  };


window.rankMarketData =
  function (marketData) {

    return RANKING_ENGINE.rank(
      marketData
    );

  };


window.getTop20Stocks =
  function (marketData) {

    return RANKING_ENGINE.getTop20(
      marketData
    );

  };


// ============================================
// READY
// ============================================

console.log(
  "Prototype-1 ranking-engine.js READY"
);

console.log(
  "Ranking engine:",
  RANKING_ENGINE.getStatus()
);
