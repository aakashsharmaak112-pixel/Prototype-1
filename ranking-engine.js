// ============================================
// PROTOTYPE-1
// RANKING ENGINE
// LIVE MARKET DATA
// ============================================

const RANKING_ENGINE = {

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
      );


    if (!Number.isFinite(change)) {
      return 0;
    }


    /*
     * Phase-1 ranking:
     *
     * Current live percentage change
     * is the primary ranking factor.
     *
     * Future phases can add:
     * - momentum
     * - volatility
     * - volume
     * - fundamentals
     * - sector strength
     * - risk score
     */


    return change;

  },


  // ==========================================
  // RANK STOCKS
  // ==========================================

  rankStocks: function (stocks) {

    if (!Array.isArray(stocks)) {
      return [];
    }


    const ranked =
      stocks
        .filter(function (stock) {

          if (!stock) {
            return false;
          }


          const price =
            Number(
              stock.price ??
              stock.ltp
            );


          return (
            Number.isFinite(price) &&
            price > 0
          );

        })


        .map(function (stock) {

          const score =
            RANKING_ENGINE.calculateScore(
              stock
            );


          return {

            ...stock,

            score: score

          };

        })


        .sort(function (a, b) {

          return (
            Number(b.score) -
            Number(a.score)
          );

        });


    return ranked;

  },


  // ==========================================
  // GET TOP 20
  // ==========================================

  getTop20: function (stocks) {

    const ranked =
      RANKING_ENGINE.rankStocks(
        stocks
      );


    return ranked.slice(
      0,
      RANKING_ENGINE.targetStocks
    );

  },


  // ==========================================
  // GET RANKING SUMMARY
  // ==========================================

  getSummary: function (stocks) {

    const ranked =
      RANKING_ENGINE.rankStocks(
        stocks
      );


    return {

      success: true,

      totalStocks:
        ranked.length,

      targetStocks:
        RANKING_ENGINE.targetStocks,

      top20:
        ranked.slice(
          0,
          RANKING_ENGINE.targetStocks
        ),

      engine:
        "Prototype Ranking Engine",

      version:
        RANKING_ENGINE.version

    };

  }

};


// ============================================
// GLOBAL ACCESS
// ============================================

window.RANKING_ENGINE =
  RANKING_ENGINE;


window.calculateStockScore =
  function (stock) {

    return RANKING_ENGINE.calculateScore(
      stock
    );

  };


window.rankStocks =
  function (stocks) {

    return RANKING_ENGINE.rankStocks(
      stocks
    );

  };


window.getTop20Stocks =
  function (stocks) {

    return RANKING_ENGINE.getTop20(
      stocks
    );

  };


console.log(
  "Prototype-1 ranking-engine.js READY",
  RANKING_ENGINE.version
);
