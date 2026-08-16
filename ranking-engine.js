// ============================================
// PROTOTYPE-1
// RANKING + INVESTMENT ENGINE
// ranking-engine.js
// ============================================

(function () {

  "use strict";


  // ==========================================
  // CONFIGURATION
  // ==========================================

  const TARGET_STOCKS = 20;

  const MIN_ALLOCATION = 500;

  const MAX_STOCKS_FOR_INVESTMENT = 10;


  // ==========================================
  // SAFE NUMBER
  // ==========================================

  function toNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;

  }


  // ==========================================
  // NORMALIZE LIVE STOCK
  // ==========================================

  function normalizeStock(stock) {

    if (!stock) {
      return null;
    }


    const symbol =
      String(
        stock.symbol ||
        stock.displaySymbol ||
        ""
      )
        .replace(/-EQ$/i, "")
        .trim()
        .toUpperCase();


    const price =
      toNumber(
        stock.price ??
        stock.ltp
      );


    const change =
      toNumber(
        stock.change ??
        stock.perChange
      );


    if (
      !symbol ||
      price <= 0
    ) {

      return null;

    }


    return {

      symbol: symbol,

      name:
        stock.name ||
        symbol,

      sector:
        stock.sector ||
        "Nifty 50",

      price: price,

      change: change,

      score: change

    };

  }


  // ==========================================
  // GET LIVE MARKET DATA
  // ==========================================

  function getLiveStocks() {

    // ----------------------------------------
    // New live data format
    // window.REAL_MARKET_DATA
    // ----------------------------------------

    if (
      Array.isArray(
        window.REAL_MARKET_DATA
      )
    ) {

      return window.REAL_MARKET_DATA
        .map(normalizeStock)
        .filter(Boolean);

    }


    // ----------------------------------------
    // Existing MARKET_DATA format
    // ----------------------------------------

    if (
      window.MARKET_DATA &&
      Array.isArray(
        window.MARKET_DATA.stocks
      )
    ) {

      return window.MARKET_DATA.stocks
        .map(normalizeStock)
        .filter(Boolean);

    }


    return [];

  }


  // ==========================================
  // CALCULATE TOP 20
  // ==========================================

  function calculateTop20() {

    const stocks =
      getLiveStocks();


    if (!stocks.length) {

      return [];

    }


    const unique =
      new Map();


    stocks.forEach(
      function (stock) {

        if (
          !unique.has(
            stock.symbol
          )
        ) {

          unique.set(
            stock.symbol,
            stock
          );

        }

      }
    );


    const rankings =
      Array.from(
        unique.values()
      );


    rankings.sort(
      function (a, b) {

        return (
          b.score -
          a.score
        );

      }
    );


    return rankings.slice(
      0,
      TARGET_STOCKS
    );

  }


  // ==========================================
  // INVESTMENT STOCK SELECTION
  // ==========================================

  function selectInvestmentStocks(
    amount
  ) {

    const investmentAmount =
      toNumber(amount);


    if (
      investmentAmount <= 0
    ) {

      return [];

    }


    const top20 =
      calculateTop20();


    if (!top20.length) {

      return [];

    }


    /*
      For the first prototype:

      - Maximum 10 stocks
      - Minimum ₹500 allocation
      - Higher-ranked stocks get higher weight
    */


    let selected =
      top20.slice(
        0,
        MAX_STOCKS_FOR_INVESTMENT
      );


    // ----------------------------------------
    // Small investment amount
    // ----------------------------------------

    if (
      investmentAmount < 5000
    ) {

      selected =
        top20.slice(
          0,
          3
        );

    }

    else if (
      investmentAmount < 10000
    ) {

      selected =
        top20.slice(
          0,
          5
        );

    }


    return selected;

  }


  // ==========================================
  // CALCULATE ALLOCATION
  // ==========================================

  function calculateAllocation(
    amount
  ) {

    const investmentAmount =
      toNumber(amount);


    if (
      investmentAmount <= 0
    ) {

      return {

        success: false,

        message:
          "Valid investment amount required.",

        stocks: []

      };

    }


    const selected =
      selectInvestmentStocks(
        investmentAmount
      );


    if (!selected.length) {

      return {

        success: false,

        message:
          "Live market data available nahi hai.",

        stocks: []

      };

    }


    // ----------------------------------------
    // Rank based weights
    // ----------------------------------------

    let totalWeight = 0;


    selected.forEach(
      function (stock, index) {

        /*
          Rank 1 = highest weight

          Example:
          Rank 1 → 10
          Rank 2 → 9
          Rank 3 → 8
          ...
        */

        stock.weight =
          selected.length -
          index;

        totalWeight +=
          stock.weight;

      }
    );


    // ----------------------------------------
    // Calculate shares
    // ----------------------------------------

    const recommendations = [];


    selected.forEach(
      function (stock, index) {

        const rawAllocation =
          investmentAmount *
          (
            stock.weight /
            totalWeight
          );


        let quantity =
          Math.floor(
            rawAllocation /
            stock.price
          );


        /*
          If allocation is less than
          one share price, quantity = 0.

          We don't force buying.
        */


        let invested =
          quantity *
          stock.price;


        recommendations.push({

          rank:
            index + 1,

          symbol:
            stock.symbol,

          name:
            stock.name,

          sector:
            stock.sector,

          price:
            stock.price,

          change:
            stock.change,

          allocation:
            Math.round(
              rawAllocation
            ),

          quantity:
            quantity,

          invested:
            Math.round(
              invested * 100
            ) / 100,

          score:
            stock.score

        });

      }
    );


    // ----------------------------------------
    // Remove zero quantity stocks
    // ----------------------------------------

    const buyable =
      recommendations.filter(
        function (stock) {

          return (
            stock.quantity > 0
          );

        }
      );


    const totalInvested =
      buyable.reduce(
        function (total, stock) {

          return (
            total +
            stock.invested
          );

        },
        0
      );


    const remaining =
      investmentAmount -
      totalInvested;


    return {

      success: true,

      investmentAmount:
        investmentAmount,

      selectedStocks:
        selected.length,

      buyableStocks:
        buyable.length,

      totalInvested:
        Math.round(
          totalInvested * 100
        ) / 100,

      remaining:
        Math.round(
          remaining * 100
        ) / 100,

      stocks:
        buyable

    };

  }


  // ==========================================
  // PUBLIC ANALYSIS FUNCTION
  // ==========================================

  function analyzeInvestmentAmount(
    amount
  ) {

    const result =
      calculateAllocation(
        amount
      );


    if (
      !result.success
    ) {

      return result;

    }


    const amountText =
      Number(
        result.investmentAmount
      )
        .toLocaleString(
          "en-IN"
        );


    if (
      result.buyableStocks === 0
    ) {

      return {

        success: true,

        message:
          `₹${amountText} ke liye current Top 20 mein kisi stock ki 1 share quantity allocation ke andar fit nahi ho rahi. Investment amount badhane par quantity calculate ki ja sakti hai.`,

        data:
          result

      };

    }


    let message =
      `₹${amountText} ke liye current live ranking ke basis par ${result.buyableStocks} stock(s) mein allocation calculate ki gayi hai. `;


    message +=
      `Total estimated investment ₹${Number(
        result.totalInvested
      ).toLocaleString(
        "en-IN"
      )}. `;


    if (
      result.remaining > 0
    ) {

      message +=
        `₹${Number(
          result.remaining
        ).toLocaleString(
          "en-IN"
        )} balance bacha hai.`;

    }


    return {

      success: true,

      message: message,

      data:
        result

    };

  }


  // ==========================================
  // GLOBAL EXPORT
  // ==========================================

  window.RANKING_ENGINE = {

    calculateTop20:
      calculateTop20,

    calculateAllocation:
      calculateAllocation,

    analyzeInvestmentAmount:
      analyzeInvestmentAmount

  };


  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;


  // ==========================================
  // DEBUG
  // ==========================================

  console.log(
    "Prototype-1 Ranking Engine loaded."
  );


})();
