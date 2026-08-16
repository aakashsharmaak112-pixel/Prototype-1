// ============================================================
// PROTOTYPE-1
// APP ENGINE
// SMART BUDGET-SAFE DIVERSIFICATION
// ============================================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================================
  // CONFIG
  // ==========================================================

  const MAX_STOCK_ALLOCATION = 0.30;
  const MIN_BALANCE_TARGET = 0;

  // ==========================================================
  // DOM READY
  // ==========================================================

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
        "Prototype-1: required analysis elements not found."
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
          "Investment analysis mein error aaya. Browser console check karein.";

      }

    });

  });


  // ==========================================================
  // MAIN ANALYSIS
  // ==========================================================

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

      // --------------------------------------------------------
      // GET TOP 20
      // --------------------------------------------------------

      let stocks = [];

      if (Array.isArray(window.TOP_20_STOCKS)) {

        stocks =
          window.TOP_20_STOCKS
            .map(normalizeStock)
            .filter(isValidStock);

      }

      // --------------------------------------------------------
      // FALLBACK TO MARKET DATA
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // SORT BY LIVE RANKING
      // --------------------------------------------------------

      stocks.sort(function (a, b) {

        return b.change - a.change;

      });

      // --------------------------------------------------------
      // BUILD PORTFOLIO
      // --------------------------------------------------------

      const selected =
        buildBudgetPortfolio(
          stocks,
          amount
        );

      if (!selected.length) {

        return {
          success: false,
          message:
            "Is budget mein Top 20 ke available prices ke basis par whole-share diversified allocation nahi ban paaya."
        };

      }

      // --------------------------------------------------------
      // TOTAL
      // --------------------------------------------------------

      const totalInvestment =
        selected.reduce(
          function (sum, stock) {

            return sum + stock.investment;

          },
          0
        );

      const balance =
        Math.max(
          0,
          amount - totalInvestment
        );

      // --------------------------------------------------------
      // HTML
      // --------------------------------------------------------

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

        selectedStocks:
          selected,

        totalInvestment:
          totalInvestment,

        balance:
          balance

      };

    };


  // ==========================================================
  // NORMALIZE STOCK
  // ==========================================================

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
      rawSymbol.replace(
        /-EQ$/i,
        ""
      );

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

      displaySymbol:
        rawSymbol,

      name: name,

      sector: sector,

      price: price,

      change: change

    };

  }


  // ==========================================================
  // VALIDATION
  // ==========================================================

  function isValidStock(stock) {

    return (
      stock &&
      stock.symbol &&
      Number.isFinite(stock.price) &&
      stock.price > 0 &&
      Number.isFinite(stock.change)
    );

  }


  // ==========================================================
  // MARKET DATA FALLBACK
  // ==========================================================

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

      Object.keys(
        market.stocks
      ).forEach(function (key) {

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
            item.lastPrice ??
            0,

          change:
            item.change ??
            item.perChange ??
            item.percentChange ??
            0

        });

      });

    }

    return result;

  }


  // ==========================================================
  // SMART BUDGET PORTFOLIO
  //
  // Main rule:
  // Top 20 mein se jo stocks budget ke andar aa sakte hain,
  // unmein sensible diversification.
  // ==========================================================

  function buildBudgetPortfolio(
    stocks,
    amount
  ) {

    if (!stocks.length || amount <= 0) {

      return [];

    }

    // --------------------------------------------------------
    // ONLY AFFORDABLE STOCKS
    // --------------------------------------------------------

    const affordable =
      stocks.filter(function (stock) {

        return stock.price <= amount;

      });

    if (!affordable.length) {

      return [];

    }

    // --------------------------------------------------------
    // HOW MANY STOCKS?
    //
    // Budget ke badhne ke saath diversification badhega.
    // Lekin expensive stocks ki wajah se force nahi karenge.
    // --------------------------------------------------------

    let desiredCount;

    if (amount < 1000) {

      desiredCount = 1;

    } else if (amount < 2500) {

      desiredCount = 2;

    } else if (amount < 5000) {

      desiredCount = 3;

    } else if (amount < 10000) {

      desiredCount = 4;

    } else if (amount < 25000) {

      desiredCount = 5;

    } else if (amount < 50000) {

      desiredCount = 6;

    } else {

      desiredCount = 8;

    }

    // --------------------------------------------------------
    // EXPENSIVE STOCKS KO AUTOMATICALLY EXCLUDE NAHI KARNA
    //
    // Pehle candidates ko score karenge.
    // --------------------------------------------------------

    const candidates =
      affordable.map(function (stock, index) {

        let score =
          stock.change;

        // Current ranking bonus
        score +=
          Math.max(
            0,
            20 - index
          ) * 0.05;

        return {
          ...stock,
          rankIndex: index,
          score: score
        };

      });

    candidates.sort(function (a, b) {

      return b.score - a.score;

    });

    // --------------------------------------------------------
    // TARGET MAX PER STOCK
    //
    // Small amount:
    // thoda flexible
    //
    // Large amount:
    // max 30% initial allocation
    // --------------------------------------------------------

    let maxPerStock =
      amount *
      MAX_STOCK_ALLOCATION;

    if (amount < 2500) {

      maxPerStock =
        amount *
        0.60;

    } else if (amount < 5000) {

      maxPerStock =
        amount *
        0.45;

    }

    // --------------------------------------------------------
    // SELECTED
    // --------------------------------------------------------

    const selected = [];

    // --------------------------------------------------------
    // PASS 1
    //
    // Highest-ranked affordable stocks.
    // Different sectors ko preference.
    // --------------------------------------------------------

    const usedSectors =
      new Set();

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < desiredCount;
      i++
    ) {

      const stock =
        candidates[i];

      if (
        usedSectors.has(stock.sector)
      ) {

        continue;

      }

      const remaining =
        amount -
        getTotalInvestment(selected);

      if (remaining <= 0) {

        break;

      }

      const quantity =
        calculateQuantity(
          stock.price,
          remaining,
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

    // --------------------------------------------------------
    // PASS 2
    //
    // Agar different sectors se desired count complete nahi hua,
    // to remaining Top 20 candidates use karenge.
    // --------------------------------------------------------

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < desiredCount;
      i++
    ) {

      const stock =
        candidates[i];

      const exists =
        selected.some(function (item) {

          return (
            item.symbol ===
            stock.symbol
          );

        });

      if (exists) {

        continue;

      }

      const remaining =
        amount -
        getTotalInvestment(selected);

      if (remaining <= 0) {

        break;

      }

      const quantity =
        calculateQuantity(
          stock.price,
          remaining,
          maxPerStock
        );

      if (quantity <= 0) {

        continue;

      }

      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          quantity *
          stock.price

      });

    }

    // --------------------------------------------------------
    // PASS 3
    //
    // Remaining budget ko intelligently use karna.
    //
    // IMPORTANT:
    // Total amount kabhi cross nahi hoga.
    // --------------------------------------------------------

    improveExistingPositions(
      selected,
      amount,
      maxPerStock
    );

    // --------------------------------------------------------
    // SORT FINAL PORTFOLIO BY RANK
    // --------------------------------------------------------

    selected.sort(function (a, b) {

      return a.rankIndex - b.rankIndex;

    });

    return selected;

  }


  // ==========================================================
  // ADD EXTRA SHARES SAFELY
  // ==========================================================

  function improveExistingPositions(
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
        getTotalInvestment(selected);

      const balance =
        amount - total;

      if (balance <= 0) {

        break;

      }

      // Highest score first
      const ordered =
        [...selected].sort(function (a, b) {

          return b.score - a.score;

        });

      for (
        let i = 0;
        i < ordered.length;
        i++
      ) {

        const stock =
          ordered[i];

        // Find actual object
        const actual =
          selected.find(function (item) {

            return (
              item.symbol ===
              stock.symbol
            );

          });

        if (!actual) {

          continue;

        }

        // Absolute max per stock
        if (
          actual.investment +
          actual.price >
          maxPerStock
        ) {

          continue;

        }

        if (
          actual.price <=
          balance
        ) {

          actual.quantity += 1;

          actual.investment +=
            actual.price;

          changed = true;

          break;

        }

      }

    }

  }


  // ==========================================================
  // QUANTITY CALCULATOR
  // ==========================================================

  function calculateQuantity(
    price,
    available,
    maximumInvestment
  ) {

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(available) ||
      available <= 0
    ) {

      return 0;

    }

    const allowed =
      Math.min(
        available,
        maximumInvestment
      );

    return Math.max(
      0,
      Math.floor(
        allowed / price
      )
    );

  }


  // ==========================================================
  // TOTAL INVESTMENT
  // ==========================================================

  function getTotalInvestment(
    selected
  ) {

    return selected.reduce(
      function (sum, stock) {

        return (
          sum +
          Number(stock.investment || 0)
        );

      },
      0
    );

  }


  // ==========================================================
  // RECOMMENDATION HTML
  // ==========================================================

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

    html += `<br>`;

    html +=
      `Amount: ₹${formatMoney(amount)}`;

    html += `<br>`;

    html +=
      `Selected Stocks: ${selected.length}`;

    html += `<br>`;

    html +=
      `Estimated Investment: ₹${formatMoney(totalInvestment)}`;

    html += `<br>`;

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

        const displaySymbol =
          stock.displaySymbol ||
          stock.symbol;

        html +=
          `<div style="
            padding:12px 0;
            border-bottom:1px solid #252d38;
          ">`;

        html +=
          `<strong>
            ${index + 1}.
            ${escapeHtml(displaySymbol)}
          </strong>`;

        html += `<br>`;

        html +=
          `<span>
            ${escapeHtml(stock.symbol)}
          </span>`;

        html += `<br>`;

        html +=
          `<span>
            ${stock.quantity}
            share${stock.quantity > 1 ? "s" : ""}
          </span>`;

        html +=
          `<span
            style="margin-left:8px;"
            class="${changeClass}"
          >`;

        html +=
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;

        html += `</span>`;

        html += `<br>`;

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

    html += `</div>`;

    html +=
      `<p style="margin-top:14px;line-height:1.6;">`;

    html +=
      `₹${formatMoney(amount)} ke liye Top 20 mein se budget ke andar available stocks ke basis par `;

    html +=
      `${selected.length} stock(s) mein diversified allocation calculate ki gayi hai. `;

    html +=
      `Total estimated investment ₹${formatMoney(totalInvestment)}. `;

    html +=
      `₹${formatMoney(balance)} balance bacha hai.`;

    html += `<br>`;

    html +=
      `Total investment entered amount se zyada nahi ho sakta.`;

    html += `<br>`;

    html +=
      `Ye calculation live market data, current ranking aur prototype diversification rules par based hai.`;

    html += `<br>`;

    html +=
      `Investment ka final decision aapka hai.`;

    html +=
      `</p>`;

    return html;

  }


  // ==========================================================
  // MONEY FORMAT
  // ==========================================================

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


  // ==========================================================
  // HTML ESCAPE
  // ==========================================================

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
