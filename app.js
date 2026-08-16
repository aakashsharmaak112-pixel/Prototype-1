// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + SMART ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================
  // GLOBAL CONFIG
  // ==========================================

  const TARGET_STOCKS = 5;
  const MAX_STOCK_ALLOCATION = 0.35;

  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener("DOMContentLoaded", function () {

    console.log("Prototype-1 app.js started.");

    const amountInput =
      document.getElementById("amount");

    const analyzeButton =
      document.getElementById("analyzeButton");

    const recommendation =
      document.getElementById("recommendation");

    if (!amountInput || !analyzeButton || !recommendation) {

      console.error(
        "Required recommendation elements not found."
      );

      return;
    }

    // ========================================
    // ANALYZE BUTTON
    // ========================================

    analyzeButton.addEventListener(
      "click",
      function () {

        const amount =
          Number(amountInput.value);

        if (!amount || amount <= 0) {

          recommendation.innerHTML =
            "Please valid investment amount enter karein.";

          return;
        }

        try {

          const result =
            window.analyzeInvestmentAmount(amount);

          if (result && result.success) {

            recommendation.innerHTML =
              result.html || result.message;

          } else {

            recommendation.innerHTML =
              result && result.message
                ? result.message
                : "Investment analysis available nahi hai.";

          }

        } catch (error) {

          console.error(
            "Investment analysis error:",
            error
          );

          recommendation.innerHTML =
            "Investment analysis mein error aaya.";
        }

      }
    );

  });


  // ==========================================
  // MAIN INVESTMENT FUNCTION
  // ==========================================

  window.analyzeInvestmentAmount =
    function (amount) {

      amount = Number(amount);

      if (!amount || amount <= 0) {

        return {
          success: false,
          message:
            "Please valid investment amount enter karein."
        };

      }

      // ========================================
      // GET LIVE TOP 20
      // ========================================

      let stocks = [];

      if (
        Array.isArray(window.TOP_20_STOCKS)
      ) {

        stocks =
          window.TOP_20_STOCKS
            .map(normalizeStock)
            .filter(isValidStock);

      }

      // ========================================
      // FALLBACK: MARKET DATA
      // ========================================

      if (!stocks.length) {

        stocks =
          getStocksFromMarketData()
            .map(normalizeStock)
            .filter(isValidStock);

      }

      if (!stocks.length) {

        return {

          success: false,

          message:
            "Pehle Connect Live Market Data karke live quotes load karein."

        };

      }

      // ========================================
      // SORT BY LIVE PERFORMANCE
      // ========================================

      stocks.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );

      // ========================================
      // SMART ALLOCATION
      // ========================================

      const selected =
        buildSmartPortfolio(
          stocks,
          amount
        );

      if (!selected.length) {

        return {

          success: false,

          message:
            "Current live prices ke basis par is amount ke andar suitable whole-share allocation nahi ban paaya."

        };

      }

      // ========================================
      // CALCULATE TOTAL
      // ========================================

      let totalInvestment = 0;

      selected.forEach(
        function (stock) {

          totalInvestment +=
            stock.investment;

        }
      );

      const balance =
        amount - totalInvestment;

      // ========================================
      // CREATE HTML
      // ========================================

      const html =
        buildRecommendationHTML(
          amount,
          selected,
          totalInvestment,
          balance
        );

      return {

        success: true,

        html: html,

        message:
          `₹${formatMoney(amount)} ke liye smart diversified allocation calculate ki gayi hai.`,

        selectedStocks:
          selected,

        totalInvestment:
          totalInvestment,

        balance:
          balance

      };

    };


  // ==========================================
  // NORMALIZE STOCK
  // ==========================================

  function normalizeStock(stock) {

    stock =
      stock || {};

    const symbol =
      String(
        stock.symbol ||
        stock.neoSymbol ||
        stock.displaySymbol ||
        ""
      )
        .replace(/-EQ$/i, "")
        .trim()
        .toUpperCase();

    const name =
      String(
        stock.name ||
        stock.companyName ||
        stock.displaySymbol ||
        symbol
      ).trim();

    const price =
      Number(
        stock.price ??
        stock.ltp ??
        stock.lastPrice ??
        stock.close ??
        0
      );

    const change =
      Number(
        stock.change ??
        stock.perChange ??
        stock.percentChange ??
        0
      );

    const sector =
      String(
        stock.sector ||
        "Nifty 50"
      );

    return {

      symbol:
        symbol,

      name:
        name,

      sector:
        sector,

      price:
        price,

      change:
        change

    };

  }


  // ==========================================
  // VALID STOCK
  // ==========================================

  function isValidStock(stock) {

    return (
      stock &&
      stock.symbol &&
      Number.isFinite(stock.price) &&
      stock.price > 0 &&
      Number.isFinite(stock.change)
    );

  }


  // ==========================================
  // GET MARKET DATA FALLBACK
  // ==========================================

  function getStocksFromMarketData() {

    const result = [];

    const market =
      window.MARKET_DATA;

    if (!market) {

      return result;

    }

    // ----------------------------------------
    // CASE 1
    // MARKET_DATA.stocks = ARRAY
    // ----------------------------------------

    if (
      Array.isArray(market.stocks)
    ) {

      return market.stocks;

    }

    // ----------------------------------------
    // CASE 2
    // MARKET_DATA.stocks = OBJECT
    // ----------------------------------------

    if (
      market.stocks &&
      typeof market.stocks === "object"
    ) {

      Object.keys(
        market.stocks
      ).forEach(
        function (key) {

          const item =
            market.stocks[key];

          result.push({

            symbol:
              item.symbol || key,

            name:
              item.name ||
              item.displaySymbol ||
              key,

            sector:
              item.sector ||
              "Nifty 50",

            price:
              item.price ??
              item.ltp ??
              0,

            change:
              item.change ??
              item.perChange ??
              0

          });

        }
      );

    }

    return result;

  }


  // ==========================================
  // SMART PORTFOLIO BUILDER
  // ==========================================

  function buildSmartPortfolio(
    stocks,
    amount
  ) {

    if (!stocks.length) {

      return [];

    }

    // ========================================
    // IMPORTANT:
    // Do NOT simply select top 3 stocks.
    //
    // We first create affordable candidates.
    // ========================================

    const affordable =
      stocks.filter(
        function (stock) {

          return stock.price <= amount;

        }
      );

    if (!affordable.length) {

      return [];

    }

    // ========================================
    // TARGET NUMBER BASED ON AMOUNT
    // ========================================

    let targetCount;

    if (amount < 5000) {

      targetCount = 2;

    }

    else if (amount < 10000) {

      targetCount = 3;

    }

    else if (amount < 25000) {

      targetCount = 4;

    }

    else {

      targetCount = TARGET_STOCKS;

    }

    // ========================================
    // MAX PER STOCK
    // ========================================

    let maxPerStock =
      amount *
      MAX_STOCK_ALLOCATION;

    // For smaller investments allow slightly
    // more flexibility.
    if (amount < 5000) {

      maxPerStock =
        amount * 0.50;

    }

    // ========================================
    // BUILD CANDIDATES
    // ========================================

    const candidates =
      affordable.map(
        function (stock, index) {

          let score =
            stock.change;

          // Ranking bonus
          score +=
            Math.max(
              0,
              20 - index
            ) * 0.02;

          // Penalize extremely expensive
          // stocks when they consume most
          // of the portfolio.
          if (
            stock.price >
            amount * 0.60
          ) {

            score -= 2;

          }

          return {

            ...stock,

            score:
              score

          };

        }
      );

    candidates.sort(
      function (a, b) {

        return b.score - a.score;

      }
    );

    // ========================================
    // SELECT STOCKS
    // ========================================

    const selected = [];

    const usedSectors =
      new Set();

    // ----------------------------------------
    // PASS 1:
    // Prefer different sectors.
    // ----------------------------------------

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < targetCount;
      i++
    ) {

      const stock =
        candidates[i];

      if (
        usedSectors.has(
          stock.sector
        )
      ) {

        continue;

      }

      const quantity =
        calculateQuantity(
          stock.price,
          amount,
          maxPerStock
        );

      if (quantity <= 0) {

        continue;

      }

      const investment =
        quantity *
        stock.price;

      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });

      usedSectors.add(
        stock.sector
      );

    }

    // ----------------------------------------
    // PASS 2:
    // Fill remaining slots.
    // ----------------------------------------

    if (
      selected.length <
      targetCount
    ) {

      for (
        let i = 0;
        i < candidates.length &&
        selected.length < targetCount;
        i++
      ) {

        const stock =
          candidates[i];

        const alreadySelected =
          selected.some(
            function (item) {

              return (
                item.symbol ===
                stock.symbol
              );

            }
          );

        if (alreadySelected) {

          continue;

        }

        const currentTotal =
          selected.reduce(
            function (sum, item) {

              return (
                sum +
                item.investment
              );

            },
            0
          );

        const remaining =
          amount -
          currentTotal;

        if (remaining <= 0) {

          break;

        }

        const quantity =
          calculateQuantity(
            stock.price,
            remaining,
            Math.min(
              maxPerStock,
              remaining
            )
          );

        if (quantity <= 0) {

          continue;

        }

        const investment =
          quantity *
          stock.price;

        selected.push({

          ...stock,

          quantity:
            quantity,

          investment:
            investment

        });

      }

    }

    // ========================================
    // IMPROVE PORTFOLIO WITH REMAINING MONEY
    // ========================================

    let total =
      selected.reduce(
        function (sum, item) {

          return (
            sum +
            item.investment
          );

        },
        0
      );

    let balance =
      amount -
      total;

    // ========================================
    // ADD EXTRA SHARES WHERE POSSIBLE
    // ========================================

    let improved = true;

    while (
      improved &&
      balance > 0
    ) {

      improved = false;

      // Highest-ranked selected stock first
      const sortedSelected =
        [...selected].sort(
          function (a, b) {

            return b.score - a.score;

          }
        );

      for (
        let i = 0;
        i < sortedSelected.length;
        i++
      ) {

        const stock =
          sortedSelected[i];

        const maxInvestment =
          amount *
          MAX_STOCK_ALLOCATION;

        if (
          stock.investment +
          stock.price >
          maxInvestment
        ) {

          continue;

        }

        if (
          stock.price <=
          balance
        ) {

          stock.quantity += 1;

          stock.investment +=
            stock.price;

          total +=
            stock.price;

          balance -=
            stock.price;

          improved = true;

          break;

        }

      }

    }

    return selected;

  }


  // ==========================================
  // QUANTITY CALCULATOR
  // ==========================================

  function calculateQuantity(
    price,
    available,
    maximumInvestment
  ) {

    if (
      !price ||
      price <= 0 ||
      available <= 0
    ) {

      return 0;

    }

    const allowed =
      Math.min(
        available,
        maximumInvestment
      );

    return Math.floor(
      allowed /
      price
    );

  }


  // ==========================================
  // RECOMMENDATION HTML
  // ==========================================

  function buildRecommendationHTML(
    amount,
    selected,
    totalInvestment,
    balance
  ) {

    let html = "";

    html +=
      `<div class="recommendation-plan">`;

    html +=
      `<strong>Investment Plan</strong>`;

    html +=
      `<br>`;

    html +=
      `Amount: ₹${formatMoney(amount)}`;

    html +=
      `<br>`;

    html +=
      `Selected Stocks: ${selected.length}`;

    html +=
      `<br>`;

    html +=
      `Estimated Investment: ₹${formatMoney(totalInvestment)}`;

    html +=
      `<br>`;

    html +=
      `Balance: ₹${formatMoney(balance)}`;

    html +=
      `</div>`;

    html +=
      `<div style="margin-top:14px;">`;

    selected.forEach(
      function (stock, index) {

        const changeClass =
          stock.change >= 0
            ? "positive"
            : "negative";

        html +=
          `<div style="
            padding:12px 0;
            border-bottom:1px solid #252d38;
          ">`;

        html +=
          `<strong>${index + 1}. ${escapeHtml(stock.name)}</strong>`;

        html +=
          `<br>`;

        html +=
          `<span>${escapeHtml(stock.symbol)}</span>`;

        html +=
          `<br>`;

        html +=
          `<span>${stock.quantity} share${stock.quantity > 1 ? "s" : ""}</span>`;

        html +=
          `<span style="margin-left:8px;" class="${changeClass}">`;

        html +=
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;

        html +=
          `</span>`;

        html +=
          `<br>`;

        html +=
          `Price: ₹${formatMoney(stock.price)}`;

        html +=
          ` &nbsp; • &nbsp; `;

        html +=
          `Invest: ₹${formatMoney(stock.investment)}`;

        html +=
          `</div>`;

      }
    );

    html +=
      `</div>`;

    html +=
      `<p style="margin-top:14px;line-height:1.6;">`;

    html +=
      `₹${formatMoney(amount)} ke liye current live ranking ke basis par `;

    html +=
      `${selected.length} stock(s) mein diversified allocation calculate ki gayi hai. `;

    html +=
      `Total estimated investment ₹${formatMoney(totalInvestment)}. `;

    html +=
      `₹${formatMoney(balance)} balance bacha hai.`;

    html +=
      `<br>`;

    html +=
      `Ye calculation live market data, ranking aur prototype diversification rules par based hai. `;

    html +=
      `Investment ka final decision aapka hai.`;

    html +=
      `</p>`;

    return html;

  }


  // ==========================================
  // MONEY FORMAT
  // ==========================================

  function formatMoney(value) {

    return Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  // ==========================================
  // HTML ESCAPE
  // ==========================================

  function escapeHtml(value) {

    return String(
      value || ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }


  console.log(
    "Prototype-1 app.js loaded successfully."
  );

})();
