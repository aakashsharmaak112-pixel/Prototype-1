// ============================================
// PROTOTYPE-1
// APP ENGINE
// SMART DIVERSIFICATION + BUDGET SAFE
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================
  // CONFIG
  // ==========================================

  const MIN_STOCKS = 1;
  const MAX_STOCKS = 6;

  // Maximum percentage of total money in one stock.
  // Large amounts get better diversification.
  const MAX_SINGLE_STOCK = 0.30;

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
        "Required investment elements not found."
      );
      return;
    }

    analyzeButton.addEventListener("click", function () {

      const amount =
        Number(amountInput.value);

      if (!Number.isFinite(amount) || amount <= 0) {

        recommendation.innerHTML =
          "Please valid investment amount enter karein.";

        return;
      }

      try {

        const result =
          window.analyzeInvestmentAmount(amount);

        if (result && result.success) {

          recommendation.innerHTML =
            result.html;

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

    });

  });


  // ==========================================
  // MAIN ANALYSIS
  // ==========================================

  window.analyzeInvestmentAmount =
    function (amount) {

      amount = Number(amount);

      if (!Number.isFinite(amount) || amount <= 0) {

        return {
          success: false,
          message:
            "Please valid investment amount enter karein."
        };

      }

      // ----------------------------------------
      // GET LIVE DATA
      // ----------------------------------------

      let stocks = [];

      if (Array.isArray(window.TOP_20_STOCKS)) {

        stocks =
          window.TOP_20_STOCKS
            .map(normalizeStock)
            .filter(isValidStock);

      }

      // Fallback
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

      // ----------------------------------------
      // RANK LIVE STOCKS
      // ----------------------------------------

      stocks.sort(function (a, b) {
        return b.change - a.change;
      });

      // ----------------------------------------
      // BUILD DYNAMIC PORTFOLIO
      // ----------------------------------------

      const selected =
        buildDiversifiedPortfolio(
          stocks,
          amount
        );

      if (!selected.length) {

        return {
          success: false,
          message:
            "Is amount ke liye available live prices se suitable whole-share allocation nahi ban paaya."
        };

      }

      // ----------------------------------------
      // TOTAL
      // ----------------------------------------

      let totalInvestment =
        selected.reduce(function (sum, stock) {
          return sum + stock.investment;
        }, 0);

      // Safety: total must NEVER exceed amount.
      if (totalInvestment > amount) {

        totalInvestment =
          amount;

      }

      const balance =
        Math.max(
          0,
          amount - totalInvestment
        );

      // ----------------------------------------
      // HTML
      // ----------------------------------------

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

        selectedStocks: selected,

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

    stock = stock || {};

    const rawSymbol =
      String(
        stock.symbol ||
        stock.neoSymbol ||
        stock.displaySymbol ||
        ""
      ).trim().toUpperCase();

    const symbol =
      rawSymbol
        .replace(/-EQ$/i, "");

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
      ).trim();

    return {

      symbol: symbol,

      name:
        name.replace(/-EQ$/i, ""),

      sector: sector,

      price: price,

      change: change

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
  // MARKET DATA FALLBACK
  // ==========================================

  function getStocksFromMarketData() {

    const result = [];

    const market =
      window.MARKET_DATA;

    if (!market) {
      return result;
    }

    if (Array.isArray(market.stocks)) {
      return market.stocks;
    }

    if (
      market.stocks &&
      typeof market.stocks === "object"
    ) {

      Object.keys(market.stocks).forEach(
        function (key) {

          const item =
            market.stocks[key] || {};

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
  // DYNAMIC STOCK COUNT
  // ==========================================

  function getTargetStockCount(amount) {

    if (amount < 1000) {
      return 1;
    }

    if (amount < 3000) {
      return 2;
    }

    if (amount < 7500) {
      return 3;
    }

    if (amount < 15000) {
      return 4;
    }

    if (amount < 30000) {
      return 5;
    }

    return 6;

  }


  // ==========================================
  // DYNAMIC MAX ALLOCATION
  // ==========================================

  function getMaxAllocation(amount) {

    if (amount < 2000) {
      return 0.70;
    }

    if (amount < 5000) {
      return 0.55;
    }

    if (amount < 10000) {
      return 0.45;
    }

    if (amount < 25000) {
      return 0.35;
    }

    return MAX_SINGLE_STOCK;

  }


  // ==========================================
  // BUILD DIVERSIFIED PORTFOLIO
  // ==========================================

  function buildDiversifiedPortfolio(
    stocks,
    amount
  ) {

    const targetCount =
      Math.min(
        MAX_STOCKS,
        Math.max(
          MIN_STOCKS,
          getTargetStockCount(amount)
        )
      );

    const maxAllocation =
      getMaxAllocation(amount);

    const maxPerStock =
      amount * maxAllocation;

    // ----------------------------------------
    // AFFORDABLE STOCKS
    // ----------------------------------------

    const affordable =
      stocks.filter(function (stock) {

        return stock.price <= amount;

      });

    if (!affordable.length) {
      return [];
    }

    // ----------------------------------------
    // SCORE
    // ----------------------------------------

    const candidates =
      affordable.map(function (stock, index) {

        let score =
          stock.change;

        // Ranking bonus
        score +=
          Math.max(
            0,
            20 - index
          ) * 0.05;

        // Prefer stocks that fit
        // comfortably inside budget.
        if (
          stock.price <=
          amount * 0.30
        ) {

          score += 0.50;

        }

        // Very expensive stock penalty.
        if (
          stock.price >
          amount * 0.60
        ) {

          score -= 1.50;

        }

        return {
          ...stock,
          score: score
        };

      });

    candidates.sort(function (a, b) {
      return b.score - a.score;
    });


    // ----------------------------------------
    // SELECT
    // DIFFERENT SECTORS FIRST
    // ----------------------------------------

    const selected = [];

    const usedSymbols =
      new Set();

    const usedSectors =
      new Set();

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < targetCount;
      i++
    ) {

      const stock =
        candidates[i];

      if (
        usedSectors.has(stock.sector)
      ) {
        continue;
      }

      const maxAllowed =
        Math.min(
          maxPerStock,
          amount
        );

      const quantity =
        Math.floor(
          maxAllowed /
          stock.price
        );

      if (quantity <= 0) {
        continue;
      }

      const investment =
        quantity *
        stock.price;

      if (
        investment > amount
      ) {
        continue;
      }

      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });

      usedSymbols.add(
        stock.symbol
      );

      usedSectors.add(
        stock.sector
      );

    }


    // ----------------------------------------
    // SECOND PASS
    // FILL EMPTY SLOTS
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
        usedSymbols.has(
          stock.symbol
        )
      ) {
        continue;
      }

      const currentTotal =
        selected.reduce(
          function (sum, item) {
            return sum + item.investment;
          },
          0
        );

      const remaining =
        amount - currentTotal;

      if (remaining <= 0) {
        break;
      }

      const allowed =
        Math.min(
          remaining,
          maxPerStock
        );

      const quantity =
        Math.floor(
          allowed /
          stock.price
        );

      if (quantity <= 0) {
        continue;
      }

      const investment =
        quantity *
        stock.price;

      if (
        currentTotal +
        investment >
        amount
      ) {
        continue;
      }

      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });

      usedSymbols.add(
        stock.symbol
      );

    }


    // ----------------------------------------
    // USE REMAINING BALANCE
    // ----------------------------------------

    improveAllocation(
      selected,
      amount,
      maxPerStock
    );


    return selected;

  }


  // ==========================================
  // IMPROVE WHOLE-SHARE ALLOCATION
  // ==========================================

  function improveAllocation(
    selected,
    amount,
    maxPerStock
  ) {

    if (!selected.length) {
      return;
    }

    let changed = true;

    while (changed) {

      changed = false;

      const total =
        selected.reduce(
          function (sum, stock) {
            return sum + stock.investment;
          },
          0
        );

      const balance =
        amount - total;

      if (balance <= 0) {
        break;
      }

      // Best-ranked stock first
      const sorted =
        [...selected].sort(
          function (a, b) {
            return b.score - a.score;
          }
        );

      for (
        let i = 0;
        i < sorted.length;
        i++
      ) {

        const stock =
          sorted[i];

        const stockLimit =
          Math.min(
            maxPerStock,
            amount
          );

        if (
          stock.investment +
          stock.price >
          stockLimit
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

          changed = true;

          break;
        }

      }

    }

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
      `<div>`;

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
          `<strong>
            ${index + 1}.
            ${escapeHtml(stock.name)}
          </strong>`;

        html +=
          `<br>`;

        html +=
          `<span>
            ${escapeHtml(stock.symbol)}
          </span>`;

        html +=
          `<br>`;

        html +=
          `<span>
            ${stock.quantity}
            share${stock.quantity > 1 ? "s" : ""}
          </span>`;

        html +=
          `<span
            style="margin-left:8px;"
            class="${changeClass}"
          >
            ${stock.change >= 0 ? "+" : ""}
            ${stock.change.toFixed(2)}%
          </span>`;

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
      `<p style="
        margin-top:14px;
        line-height:1.6;
      ">`;

    html +=
      `₹${formatMoney(amount)} ke liye `;

    html +=
      `current live ranking ke basis par `;

    html +=
      `${selected.length} stock(s) mein `;

    html +=
      `budget-safe diversified allocation `;

    html +=
      `calculate ki gayi hai. `;

    html +=
      `Total estimated investment `;

    html +=
      `₹${formatMoney(totalInvestment)}. `;

    html +=
      `₹${formatMoney(balance)} balance bacha hai.`;

    html +=
      `<br>`;

    html +=
      `Total investment entered amount se zyada nahi ho sakta.`;

    html +=
      `<br>`;

    html +=
      `Ye calculation live market data aur prototype diversification rules par based hai.`;

    html +=
      `<br>`;

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
  // ESCAPE HTML
  // ==========================================

  function escapeHtml(value) {

    return String(
      value || ""
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  console.log(
    "Prototype-1 app.js loaded successfully."
  );

})();
