// ============================================
// PROTOTYPE-1
// LIVE RANKING ENGINE
// ============================================
//
// Ranking is based on currently available
// live quote data.
//
// This is a prototype scoring model.
// It is NOT a buy/sell recommendation.
// ============================================


const RANKING_ENGINE = {

  version: "1.0",

  status: "READY",

  targetCount: 20

};


// ============================================
// SAFE NUMBER
// ============================================

function safeNumber(value) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;

}


// ============================================
// CALCULATE STOCK SCORE
// ============================================
//
// Current live quote data gives us:
// - price
// - percentage change
//
// For now the score is primarily based
// on live percentage change.
//
// Later we will add:
// - momentum
// - volatility
// - liquidity
// - sector strength
// - trend
// - historical data
//
// ============================================

function calculateStockScore(stock) {

  const change =
    safeNumber(stock.change);


  // Normalize change into a usable score.

  const momentumScore =
    Math.max(
      0,
      Math.min(
        100,
        50 + (change * 5)
      )
    );


  return Number(
    momentumScore.toFixed(2)
  );

}


// ============================================
// BUILD RANKINGS
// ============================================

function calculateLiveRankings() {

  if (
    !window.NIFTY_50_STOCKS ||
    !Array.isArray(
      window.NIFTY_50_STOCKS
    )
  ) {

    console.error(
      "NIFTY_50_STOCKS not available."
    );

    return [];

  }


  if (
    !window.MARKET_DATA ||
    !window.MARKET_DATA.stocks
  ) {

    console.error(
      "MARKET_DATA not available."
    );

    return [];

  }


  const liveData =
    window.MARKET_DATA.stocks;


  const rankings = [];


  // ------------------------------------------
  // PROCESS EACH NIFTY STOCK
  // ------------------------------------------

  window.NIFTY_50_STOCKS.forEach(
    function(stock) {


      const data =
        liveData[
          stock.symbol
        ];


      // Ignore stocks for which
      // no live quote was received.

      if (!data) {
        return;
      }


      const price =
        safeNumber(
          data.price
        );


      const change =
        safeNumber(
          data.change
        );


      if (price <= 0) {
        return;
      }


      const score =
        calculateStockScore({

          price:
            price,

          change:
            change

        });


      rankings.push({

        symbol:
          stock.symbol,

        name:
          stock.name,

        sector:
          stock.sector,

        price:
          price,

        change:
          change,

        score:
          score

      });

    }
  );


  // ------------------------------------------
  // SORT BY SCORE
  // ------------------------------------------

  rankings.sort(
    function(a, b) {

      return (
        b.score -
        a.score
      );

    }
  );


  // ------------------------------------------
  // ASSIGN RANK
  // ------------------------------------------

  rankings.forEach(
    function(stock, index) {

      stock.rank =
        index + 1;

    }
  );


  return rankings;

}


// ============================================
// GET TOP 20
// ============================================

function getLiveTop20() {

  const rankings =
    calculateLiveRankings();


  return rankings.slice(
    0,
    RANKING_ENGINE.targetCount
  );

}


// ============================================
// GET STOCK RANK
// ============================================

function getLiveStockRank(symbol) {

  const rankings =
    calculateLiveRankings();


  const stock =
    rankings.find(
      function(item) {

        return (
          item.symbol ===
          symbol
        );

      }
    );


  return stock || null;

}


// ============================================
// GET RANKING ENGINE STATUS
// ============================================

function getRankingEngineStatus() {

  return {

    version:
      RANKING_ENGINE.version,

    status:
      RANKING_ENGINE.status,

    targetCount:
      RANKING_ENGINE.targetCount,

    liveStocks:
      window.MARKET_DATA &&
      window.MARKET_DATA.stocks
        ? Object.keys(
            window.MARKET_DATA.stocks
          ).length
        : 0

  };

}


// ============================================
// BROWSER ACCESS
// ============================================

if (
  typeof window !== "undefined"
) {

  window.RANKING_ENGINE =
    RANKING_ENGINE;


  window.calculateStockScore =
    calculateStockScore;


  window.calculateLiveRankings =
    calculateLiveRankings;


  window.getLiveTop20 =
    getLiveTop20;


  window.getLiveStockRank =
    getLiveStockRank;


  window.getRankingEngineStatus =
    getRankingEngineStatus;

}


// ============================================
// STARTUP
// ============================================

console.log(
  "================================"
);

console.log(
  "PROTOTYPE-1 LIVE RANKING ENGINE"
);

console.log(
  "Version:",
  RANKING_ENGINE.version
);

console.log(
  "Target:",
  RANKING_ENGINE.targetCount
);

console.log(
  "================================"
);
