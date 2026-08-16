// ============================================
// PROTOTYPE-1
// APP.JS
// ANALYZE + SMART DIVERSIFICATION ONLY
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================
  // CONFIG
  // ==========================================

  const MAX_STOCKS = 6;

  // Maximum amount allowed in one stock
  function getMaxAllocation(amount) {

    if (amount < 2000) return 0.70;
    if (amount < 5000) return 0.55;
    if (amount < 10000) return 0.45;
    if (amount < 25000) return 0.35;

    return 0.30;
  }


  // ==========================================
  // TARGET STOCK COUNT
  // ==========================================

  function getTargetStockCount(amount) {

    if (amount < 1000) return 1;
    if (amount < 3000) return 2;
    if (amount < 7500) return 3;
    if (amount < 15000) return 4;
    if (amount < 30000) return 5;

    return 6;
  }


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      console.log(
        "Prototype-1 app.js DOM ready."
      );

      const analyzeButton =
        document.getElementById(
          "analyzeButton"
        );

      const amountInput =
        document.getElementById(
          "amount"
        );

      const recommendation =
        document.getElementById(
          "recommendation"
        );


      if (
        !analyzeButton ||
        !amountInput ||
        !recommendation
      ) {

        console.error(
          "Analyze elements not found."
        );

        return;
      }


      // ========================================
      // ANALYZE BUTTON ONLY
      // ========================================

      analyzeButton.addEventListener(
        "click",
        function () {

          const amount =
            Number(
              amountInput.value
            );


          if (
            !Number.isFinite(amount) ||
            amount <= 0
          ) {

            recommendation.innerHTML =
              "Please valid investment amount enter karein.";

            return;
          }


          try {

            const result =
              window.analyzeInvestmentAmount(
                amount
              );


            if (
              result &&
              result.success
            ) {

              recommendation.innerHTML =
                result.html;

            } else {

              recommendation.innerHTML =
                result &&
                result.message
                  ? result.message
                  : "Investment analysis available nahi hai.";

            }

          }

          catch (error) {

            console.error(
              "Analysis error:",
              error
            );

            recommendation.innerHTML =
              "Investment analysis mein error aaya.";

          }

        }
      );

    }
  );


  // ==========================================
  // PUBLIC ANALYZE FUNCTION
  // ==========================================

  window.analyzeInvestmentAmount =
    function (amount) {

      amount =
        Number(amount);


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

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
        Array.isArray(
          window.TOP_20_STOCKS
        )
      ) {

        stocks =
          window.TOP_20_STOCKS
            .map(normalizeStock)
            .filter(isValidStock);

      }


      // ========================================
      // FALLBACK TO MARKET DATA
      // ========================================

      if (!stocks.length) {

        stocks =
          getMarketStocks()
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
      // LIVE RANKING
      // ========================================

      stocks.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );


      // ========================================
      // BUILD PORTFOLIO
      // ========================================

      const selected =
        buildPortfolio(
          stocks,
          amount
        );


      if (!selected.length) {

        return {

          success: false,

          message:
            "Is amount ke liye current live prices se suitable whole-share allocation nahi ban paaya."

        };

      }


      // ========================================
      // TOTAL
      // ========================================

      const totalInvestment =
        selected.reduce(
          function (total, stock) {

            return (
              total +
              stock.investment
            );

          },
          0
        );


      const safeTotal =
        Math.min(
          totalInvestment,
          amount
        );


      const balance =
        Math.max(
          0,
          amount -
          safeTotal
        );


      // ========================================
      // RESULT
      // ========================================

      return {

        success: true,

        html:
          buildHTML(
            amount,
            selected,
            safeTotal,
            balance
          ),

        selectedStocks:
          selected,

        totalInvestment:
          safeTotal,

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


    let symbol =
      String(
        stock.symbol ||
        stock.neoSymbol ||
        stock.displaySymbol ||
        ""
      )
        .trim()
        .toUpperCase();


    symbol =
      symbol.replace(
        /-EQ$/i,
        ""
      );


    let name =
      String(
        stock.name ||
        stock.companyName ||
        stock.displaySymbol ||
        symbol
      )
        .trim();


    name =
      name.replace(
        /-EQ$/i,
        ""
      );


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
      Number.isFinite(
        stock.price
      ) &&
      stock.price > 0 &&
      Number.isFinite(
        stock.change
      )
    );

  }


  // ==========================================
  // MARKET DATA FALLBACK
  // ==========================================

  function getMarketStocks() {

    const output = [];

    const market =
      window.MARKET_DATA;


    if (!market) {

      return output;

    }


    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks;

    }


    if (
      market.stocks &&
      typeof market.stocks ===
      "object"
    ) {

      Object.keys(
        market.stocks
      ).forEach(
        function (key) {

          const item =
            market.stocks[key] ||
            {};


          output.push({

            symbol:
              item.symbol ||
              key,

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


    return output;

  }


  // ==========================================
  // BUILD PORTFOLIO
  // ==========================================

  function buildPortfolio(
    stocks,
    amount
  ) {

    const targetCount =
      getTargetStockCount(
        amount
      );


    const maxAllocation =
      getMaxAllocation(
        amount
      );


    const maxPerStock =
      amount *
      maxAllocation;


    // ========================================
    // AFFORDABLE STOCKS
    // ========================================

    const affordable =
      stocks.filter(
        function (stock) {

          return (
            stock.price <=
            amount
          );

        }
      );


    if (!affordable.length) {

      return [];

    }


    // ========================================
    // SCORE
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
            ) * 0.05;


          // Prefer affordable stocks
          if (
            stock.price <=
            amount * 0.30
          ) {

            score +=
              0.50;

          }


          // Expensive stock penalty
          if (
            stock.price >
            amount * 0.60
          ) {

            score -=
              1.50;

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
    // SELECT
    // ========================================

    const selected = [];

    const selectedSymbols =
      new Set();

    const selectedSectors =
      new Set();


    // ----------------------------------------
    // PASS 1
    // Different sectors
    // ----------------------------------------

    for (
      let i = 0;
      i < candidates.length &&
      selected.length <
        targetCount;
      i++
    ) {

      const stock =
        candidates[i];


      if (
        selectedSectors.has(
          stock.sector
        )
      ) {

        continue;

      }


      const quantity =
        Math.floor(
          Math.min(
            maxPerStock,
            amount
          ) /
          stock.price
        );


      if (
        quantity <= 0
      ) {

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


      selectedSymbols.add(
        stock.symbol
      );


      selectedSectors.add(
        stock.sector
      );

    }


    // ----------------------------------------
    // PASS 2
    // Fill remaining stocks
    // ----------------------------------------

    for (
      let i = 0;
      i < candidates.length &&
      selected.length <
        targetCount;
      i++
    ) {

      const stock =
        candidates[i];


      if (
        selectedSymbols.has(
          stock.symbol
        )
      ) {

        continue;

      }


      const total =
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
        total;


      if (
        remaining <= 0
      ) {

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


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity *
        stock.price;


      if (
        total +
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


      selectedSymbols.add(
        stock.symbol
      );

    }


    // ========================================
    // USE REMAINING BALANCE
    // ========================================

    improveShares(
      selected,
      amount,
      maxPerStock
    );


    return selected;

  }


  // ==========================================
  // IMPROVE WHOLE SHARE USAGE
  // ==========================================

  function improveShares(
    selected,
    amount,
    maxPerStock
  ) {

    let changed =
      true;


    while (
      changed
    ) {

      changed =
        false;


      const total =
        selected.reduce(
          function (sum, stock) {

            return (
              sum +
              stock.investment
            );

          },
          0
        );


      const balance =
        amount -
        total;


      if (
        balance <= 0
      ) {

        break;

      }


      const sorted =
        [...selected].sort(
          function (a, b) {

            return (
              b.score -
              a.score
            );

          }
        );


      for (
        let i = 0;
        i < sorted.length;
        i++
      ) {

        const stock =
          sorted[i];


        if (
          stock.investment +
          stock.price >
          maxPerStock
        ) {

          continue;

        }


        if (
          stock.price <=
          balance
        ) {

          stock.quantity +=
            1;

          stock.investment +=
            stock.price;

          changed =
            true;

          break;

        }

      }

    }

  }


  // ==========================================
  // BUILD RESULT HTML
  // ==========================================

  function buildHTML(
    amount,
    selected,
    total,
    balance
  ) {

    let html = "";


    html +=
      "<div>";


    html +=
      "<strong>Investment Plan</strong>";


    html +=
      "<br>";


    html +=
      "Amount: ₹" +
      money(amount);


    html +=
      "<br>";


    html +=
      "Selected Stocks: " +
      selected.length;


    html +=
      "<br>";


    html +=
      "Estimated Investment: ₹" +
      money(total);


    html +=
      "<br>";


    html +=
      "Balance: ₹" +
      money(balance);


    html +=
      "</div>";


    html +=
      "<div style='margin-top:14px;'>";


    selected.forEach(
      function (stock, index) {

        const changeClass =
          stock.change >= 0
            ? "positive"
            : "negative";


        html +=
          "<div style='" +
          "padding:12px 0;" +
          "border-bottom:1px solid #252d38;" +
          "'>";


        html +=
          "<strong>" +
          (index + 1) +
          ". " +
          escapeHTML(
            stock.name
          ) +
          "</strong>";


        html +=
          "<br>";


        html +=
          escapeHTML(
            stock.symbol
          );


        html +=
          "<br>";


        html +=
          stock.quantity +
          " share" +
          (
            stock.quantity > 1
              ? "s"
              : ""
          );


        html +=
          " <span class='" +
          changeClass +
          "' style='margin-left:8px;'>" +
          (
            stock.change >= 0
              ? "+"
              : ""
          ) +
          stock.change.toFixed(2) +
          "%" +
          "</span>";


        html +=
          "<br>";


        html +=
          "Price: ₹" +
          money(
            stock.price
          );


        html +=
          " &nbsp; • &nbsp; ";


        html +=
          "Invest: ₹" +
          money(
            stock.investment
          );


        html +=
          "</div>";

      }
    );


    html +=
      "</div>";


    html +=
      "<p style='margin-top:14px;line-height:1.6;'>";


    html +=
      "₹" +
      money(amount) +
      " ke liye current live ranking ke basis par ";


    html +=
      selected.length +
      " stock(s) mein budget-safe diversified allocation calculate ki gayi hai.";


    html +=
      "<br>";


    html +=
      "Total estimated investment ₹" +
      money(total) +
      ".";


    html +=
      "<br>";


    html +=
      "₹" +
      money(balance) +
      " balance bacha hai.";


    html +=
      "<br>";


    html +=
      "Total investment entered amount se zyada nahi ho sakta.";


    html +=
      "<br>";


    html +=
      "Ye calculation live market data aur prototype diversification rules par based hai.";


    html +=
      "<br>";


    html +=
      "Investment ka final decision aapka hai.";


    html +=
      "</p>";


    return html;

  }


  // ==========================================
  // MONEY
  // ==========================================

  function money(value) {

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
  // ESCAPE
  // ==========================================

  function escapeHTML(value) {

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
