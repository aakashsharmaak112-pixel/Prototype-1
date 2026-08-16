// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE TOP-20 + BUDGET-SAFE DIVERSIFICATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  const MAX_STOCK_ALLOCATION = 0.35;
  const MAX_PORTFOLIO_STOCKS = 10;


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


    if (
      !amountInput ||
      !analyzeButton ||
      !recommendation
    ) {

      console.error(
        "Prototype-1: required analysis elements not found."
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


        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {

          recommendation.innerHTML =
            "Please valid investment amount enter karein.";

          return;
        }


        analyzeButton.disabled = true;


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

          }

          else {

            recommendation.innerHTML =
              (
                result &&
                result.message
              ) ||
              "Investment analysis available nahi hai.";

          }


        }

        catch (error) {

          console.error(
            "Investment analysis error:",
            error
          );

          recommendation.innerHTML =
            "Investment analysis mein error aaya.";

        }


        finally {

          analyzeButton.disabled = false;

        }

      }
    );

  });


  // ==========================================
  // MAIN ANALYSIS
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
      // GET CURRENT TOP 20
      // ========================================

      let stocks =
        getTop20Stocks();


      // ========================================
      // FALLBACK MARKET DATA
      // ========================================

      if (
        !stocks.length
      ) {

        stocks =
          getStocksFromMarketData();

      }


      stocks =
        stocks
          .map(normalizeStock)
          .filter(isValidStock);


      if (
        !stocks.length
      ) {

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

          return (
            b.change -
            a.change
          );

        }
      );


      // ========================================
      // BUILD PORTFOLIO
      // ========================================

      const selected =
        buildDiversifiedPortfolio(
          stocks,
          amount
        );


      if (
        !selected.length
      ) {

        return {

          success: false,

          message:
            "Current Top 20 ke prices ke basis par is budget mein whole-share allocation nahi ban paaya."

        };

      }


      const totalInvestment =
        selected.reduce(
          function (sum, stock) {

            return (
              sum +
              stock.investment
            );

          },
          0
        );


      // Absolute safety:
      // investment kabhi budget se zyada nahi.
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


      return {

        success: true,

        html:
          buildRecommendationHTML(
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
  // GET TOP 20
  // ==========================================

  function getTop20Stocks() {

    const sources = [

      window.TOP_20_STOCKS,

      window.TOP20_STOCKS,

      window.top20Stocks

    ];


    for (
      let i = 0;
      i < sources.length;
      i++
    ) {

      if (
        Array.isArray(
          sources[i]
        ) &&
        sources[i].length
      ) {

        return sources[i]
          .slice(0, 20);

      }

    }


    return [];

  }


  // ==========================================
  // MARKET DATA FALLBACK
  // ==========================================

  function getStocksFromMarketData() {

    const result = [];

    const market =
      window.MARKET_DATA;


    if (
      !market ||
      !market.stocks
    ) {

      return result;

    }


    // ARRAY

    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks
        .slice(0, 20);

    }


    // OBJECT

    if (
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


          result.push({

            symbol:
              item.symbol ||
              key,

            name:
              item.name ||
              item.companyName ||
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

        }
      );

    }


    return result
      .slice(0, 20);

  }


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
        .replace(
          /-EQ$/i,
          ""
        )
        .trim()
        .toUpperCase();


    const name =
      String(
        stock.name ||
        stock.companyName ||
        stock.displaySymbol ||
        symbol
      )
        .trim();


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
      )
        .trim();


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

    return Boolean(

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
  // DIVERSIFICATION ENGINE
  // ==========================================

  function buildDiversifiedPortfolio(
    stocks,
    amount
  ) {

    // ----------------------------------------
    // ONLY AFFORDABLE TOP-20 STOCKS
    // ----------------------------------------

    const affordable =
      stocks.filter(
        function (stock) {

          return (
            stock.price <=
            amount
          );

        }
      );


    if (
      !affordable.length
    ) {

      return [];

    }


    // ----------------------------------------
    // NUMBER OF STOCKS BASED ON BUDGET
    // ----------------------------------------

    const targetCount =
      calculateTargetCount(
        affordable.length,
        amount
      );


    // ----------------------------------------
    // CREATE RANKING SCORE
    // ----------------------------------------

    const candidates =
      affordable.map(
        function (stock, index) {

          const rankingBonus =
            Math.max(
              0,
              20 - index
            ) * 0.05;


          const score =
            stock.change +
            rankingBonus;


          return {

            ...stock,

            score:
              score,

            rank:
              index + 1

          };

        }
      );


    candidates.sort(
      function (a, b) {

        return (
          b.score -
          a.score
        );

      }
    );


    // ----------------------------------------
    // MAXIMUM INITIAL ALLOCATION
    // ----------------------------------------

    let maxPerStock =
      amount *
      MAX_STOCK_ALLOCATION;


    // Small budgets need more flexibility.
    if (
      amount < 5000
    ) {

      maxPerStock =
        amount *
        0.50;

    }


    // If no stock fits the normal cap,
    // temporarily allow the budget itself.
    if (
      !candidates.some(
        function (stock) {

          return (
            stock.price <=
            maxPerStock
          );

        }
      )
    ) {

      maxPerStock =
        amount;

    }


    const selected = [];

    const selectedSymbols =
      new Set();

    const selectedSectors =
      new Set();


    // ========================================
    // PASS 1
    // DIFFERENT SECTORS
    // ========================================

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


      if (
        selectedSectors.has(
          stock.sector
        )
      ) {

        continue;

      }


      const remaining =
        amount -
        getTotal(selected);


      if (
        remaining <= 0
      ) {

        break;

      }


      const quantity =
        calculateShares(
          stock.price,
          remaining,
          maxPerStock
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      addPosition(
        selected,
        stock,
        quantity
      );


      selectedSymbols.add(
        stock.symbol
      );


      selectedSectors.add(
        stock.sector
      );

    }


    // ========================================
    // PASS 2
    // FILL MORE TOP-20 STOCKS
    // ========================================

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


      const remaining =
        amount -
        getTotal(selected);


      if (
        remaining <= 0
      ) {

        break;

      }


      const quantity =
        calculateShares(
          stock.price,
          remaining,
          maxPerStock
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      addPosition(
        selected,
        stock,
        quantity
      );


      selectedSymbols.add(
        stock.symbol
      );

    }


    // ========================================
    // PASS 3
    // USE REMAINING MONEY
    // ========================================

    let changed = true;


    while (
      changed
    ) {

      changed = false;


      const balance =
        amount -
        getTotal(selected);


      if (
        balance <= 0
      ) {

        break;

      }


      const ranked =
        selected
          .slice()
          .sort(
            function (a, b) {

              return (
                b.score -
                a.score
              );

            }
          );


      for (
        let i = 0;
        i < ranked.length;
        i++
      ) {

        const stock =
          ranked[i];


        const hardCap =
          amount *
          MAX_STOCK_ALLOCATION;


        if (
          stock.investment +
          stock.price >
          hardCap
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


    // ========================================
    // FINAL SAFETY
    // ========================================

    return selected.filter(
      function (stock) {

        return (

          stock.quantity > 0 &&

          stock.investment > 0 &&

          stock.investment <= amount

        );

      }
    );

  }


  // ==========================================
  // TARGET STOCK COUNT
  // ==========================================

  function calculateTargetCount(
    affordableCount,
    amount
  ) {

    let target;


    if (
      amount < 2000
    ) {

      target = 1;

    }

    else if (
      amount < 5000
    ) {

      target = 2;

    }

    else if (
      amount < 10000
    ) {

      target = 3;

    }

    else if (
      amount < 20000
    ) {

      target = 4;

    }

    else if (
      amount < 35000
    ) {

      target = 5;

    }

    else if (
      amount < 50000
    ) {

      target = 6;

    }

    else if (
      amount < 75000
    ) {

      target = 7;

    }

    else if (
      amount < 100000
    ) {

      target = 8;

    }

    else {

      target =
        MAX_PORTFOLIO_STOCKS;

    }


    return Math.max(

      1,

      Math.min(
        target,
        affordableCount,
        MAX_PORTFOLIO_STOCKS
      )

    );

  }


  // ==========================================
  // WHOLE SHARE CALCULATOR
  // ==========================================

  function calculateShares(
    price,
    available,
    maximumInvestment
  ) {

    if (

      !Number.isFinite(
        price
      ) ||

      price <= 0 ||

      available <= 0 ||

      maximumInvestment <= 0

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
  // ADD POSITION
  // ==========================================

  function addPosition(
    selected,
    stock,
    quantity
  ) {

    if (
      quantity <= 0
    ) {

      return;

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


  // ==========================================
  // TOTAL
  // ==========================================

  function getTotal(
    selected
  ) {

    return selected.reduce(
      function (sum, stock) {

        return (
          sum +
          stock.investment
        );

      },
      0
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
      '<div class="investment-summary">';


    html +=
      '<div class="investment-title">Investment Plan</div>';


    html +=
      `Amount: ₹${formatMoney(amount)}<br>`;


    html +=
      `Selected Stocks: ${selected.length}<br>`;


    html +=
      `Estimated Investment: ₹${formatMoney(totalInvestment)}<br>`;


    html +=
      `Balance: ₹${formatMoney(balance)}`;


    html +=
      "</div>";


    html +=
      "<div>";


    selected.forEach(
      function (stock, index) {

        const changeClass =
          stock.change >= 0
            ? "positive"
            : "negative";


        html +=
          '<div style="padding:12px 0;border-bottom:1px solid #252d38;">';


        html +=
          `<strong>${index + 1}. ${escapeHtml(stock.name)}</strong>`;


        html +=
          "<br>";


        html +=
          `<span>${escapeHtml(stock.symbol)}</span>`;


        html +=
          "<br>";


        html +=
          `<span>${stock.quantity} share${stock.quantity > 1 ? "s" : ""}</span>`;


        html +=
          `<span style="margin-left:8px;" class="${changeClass}">`;


        html +=
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;


        html +=
          "</span>";


        html +=
          "<br>";


        html +=
          `Price: ₹${formatMoney(stock.price)}`;


        html +=
          " &nbsp; • &nbsp; ";


        html +=
          `Invest: ₹${formatMoney(stock.investment)}`;


        html +=
          "</div>";

      }
    );


    html +=
      "</div>";


    html +=
      '<p style="margin-top:14px;line-height:1.6;">';


    html +=
      `₹${formatMoney(amount)} ke liye Top 20 mein se budget ke andar `;


    html +=
      `${selected.length} stock(s) mein diversified allocation calculate ki gayi hai.`;


    html +=
      `<br>Total estimated investment ₹${formatMoney(totalInvestment)}.`;


    html +=
      `<br>₹${formatMoney(balance)} balance bacha hai.`;


    html +=
      "<br>Total investment entered amount se zyada nahi ho sakta.";


    html +=
      "<br>";


    html +=
      "Ye calculation live market data, current ranking aur prototype diversification rules par based hai. ";


    html +=
      "Investment ka final decision aapka hai.";


    html +=
      "</p>";


    return html;

  }


  // ==========================================
  // MONEY FORMAT
  // ==========================================

  function formatMoney(
    value
  ) {

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

  function escapeHtml(
    value
  ) {

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
