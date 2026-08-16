// ============================================
// PROTOTYPE-1
// APP.JS
// SMART TOP-20 DIVERSIFICATION
// BUDGET-AWARE WHOLE-SHARE ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");


  // ==========================================
  // CONFIG
  // ==========================================

  const MAX_STOCKS = 10;

  const DEFAULT_MAX_STOCK_ALLOCATION = 0.35;


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

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
          "Prototype-1: Required Analyze elements not found."
        );

        return;

      }


      // ========================================
      // ANALYZE BUTTON ONLY
      // ========================================
      // IMPORTANT:
      // Connect button is NOT handled here.
      // market-data.js remains responsible
      // for live connection.
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

    }
  );


  // ==========================================
  // MAIN PUBLIC FUNCTION
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
      // GET TOP 20
      // ========================================

      let stocks =
        getTop20Stocks();


      // ========================================
      // FALLBACK TO MARKET DATA
      // ========================================

      if (!stocks.length) {

        stocks =
          getMarketStocks();

      }


      stocks =
        stocks
          .map(normalizeStock)
          .filter(isValidStock);


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
      // ONLY TOP 20
      // ========================================

      stocks =
        stocks.slice(0, 20);


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
            "Top 20 stocks mein current prices ke basis par is budget ke andar whole-share diversification possible nahi hua."

        };

      }


      // ========================================
      // TOTAL
      // ========================================

      const totalInvestment =
        getTotalInvestment(
          selected
        );


      const balance =
        Math.max(
          0,
          amount - totalInvestment
        );


      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            selected,
            totalInvestment,
            balance
          ),

        selectedStocks:
          selected,

        totalInvestment:
          totalInvestment,

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

      window.REAL_TOP_20

    ];


    for (
      let i = 0;
      i < sources.length;
      i++
    ) {

      if (
        Array.isArray(sources[i]) &&
        sources[i].length
      ) {

        return sources[i].slice(0, 20);

      }

    }


    return [];

  }


  // ==========================================
  // MARKET DATA FALLBACK
  // ==========================================

  function getMarketStocks() {

    const result = [];

    const market =
      window.MARKET_DATA;


    if (
      !market ||
      !market.stocks
    ) {

      return result;

    }


    if (
      Array.isArray(market.stocks)
    ) {

      return market.stocks.slice(0, 20);

    }


    if (
      typeof market.stocks === "object"
    ) {

      Object.keys(
        market.stocks
      ).forEach(
        function (key) {

          const item =
            market.stocks[key] || {};


          result.push({

            symbol:
              item.symbol || key,

            name:
              item.name ||
              item.companyName ||
              item.displaySymbol ||
              key,

            sector:
              item.sector ||
              getSector(
                item.symbol || key
              ),

            price:
              item.price ??
              item.ltp ??
              item.lastPrice ??
              0,

            change:
              item.perChange ??
              item.percentChange ??
              item.change ??
              0

          });

        }
      );

    }


    return result.slice(0, 20);

  }


  // ==========================================
  // NORMALIZE
  // ==========================================

  function normalizeStock(stock) {

    stock =
      stock || {};


    const rawSymbol =
      String(
        stock.symbol ||
        stock.neoSymbol ||
        stock.displaySymbol ||
        ""
      )
        .trim()
        .toUpperCase();


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
      )
        .replace(
          /-EQ$/i,
          ""
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
        stock.perChange ??
        stock.percentChange ??
        stock.pChange ??
        stock.change ??
        0
      );


    return {

      symbol: symbol,

      name: name,

      sector:
        String(
          stock.sector ||
          getSector(symbol)
        ),

      price: price,

      change: change

    };

  }


  // ==========================================
  // VALIDATION
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
  // SECTOR MAP
  // ==========================================

  function getSector(symbol) {

    const map = {

      ADANIENT:
        "Adani Group",

      ADANIPORTS:
        "Adani Group",

      APOLLOHOSP:
        "Healthcare",

      ASIANPAINT:
        "Consumer",

      AXISBANK:
        "Financial Services",

      "BAJAJ-AUTO":
        "Automobile",

      BAJFINANCE:
        "Financial Services",

      BAJAJFINSV:
        "Financial Services",

      BEL:
        "Defence",

      BHARTIARTL:
        "Telecommunication",

      CIPLA:
        "Healthcare",

      COALINDIA:
        "Energy",

      DRREDDY:
        "Healthcare",

      EICHERMOT:
        "Automobile",

      ETERNAL:
        "Consumer Services",

      GRASIM:
        "Cement",

      HCLTECH:
        "Information Technology",

      HDFCBANK:
        "Financial Services",

      HDFCLIFE:
        "Financial Services",

      HEROMOTOCO:
        "Automobile",

      HINDALCO:
        "Metals",

      HINDUNILVR:
        "FMCG",

      ICICIBANK:
        "Financial Services",

      INDUSINDBK:
        "Financial Services",

      INFY:
        "Information Technology",

      ITC:
        "FMCG",

      JIOFIN:
        "Financial Services",

      JSWSTEEL:
        "Metals",

      KOTAKBANK:
        "Financial Services",

      LT:
        "Construction",

      "M&M":
        "Automobile",

      MARUTI:
        "Automobile",

      NESTLEIND:
        "FMCG",

      NTPC:
        "Power",

      ONGC:
        "Energy",

      POWERGRID:
        "Power",

      RELIANCE:
        "Energy",

      SBILIFE:
        "Financial Services",

      SBIN:
        "Financial Services",

      SHRIRAMFIN:
        "Financial Services",

      SUNPHARMA:
        "Healthcare",

      TATACONSUM:
        "FMCG",

      TATAMOTORS:
        "Automobile",

      TATASTEEL:
        "Metals",

      TCS:
        "Information Technology",

      TECHM:
        "Information Technology",

      TITAN:
        "Consumer",

      TRENT:
        "Consumer Services",

      ULTRACEMCO:
        "Cement",

      WIPRO:
        "Information Technology"

    };


    return (
      map[
        String(
          symbol || ""
        ).toUpperCase()
      ] ||
      "Nifty 50"
    );

  }


  // ==========================================
  // HOW MANY STOCKS?
  // ==========================================

  function getTargetCount(
    amount,
    affordableCount
  ) {

    let target;


    if (amount < 1000) {

      target = 1;

    }

    else if (amount < 3000) {

      target = 2;

    }

    else if (amount < 5000) {

      target = 3;

    }

    else if (amount < 10000) {

      target = 4;

    }

    else if (amount < 20000) {

      target = 5;

    }

    else if (amount < 35000) {

      target = 6;

    }

    else if (amount < 50000) {

      target = 7;

    }

    else if (amount < 75000) {

      target = 8;

    }

    else if (amount < 100000) {

      target = 9;

    }

    else {

      target = MAX_STOCKS;

    }


    return Math.min(
      target,
      affordableCount,
      MAX_STOCKS
    );

  }


  // ==========================================
  // PORTFOLIO BUILDER
  // ==========================================

  function buildPortfolio(
    stocks,
    amount
  ) {

    // ----------------------------------------
    // ONLY STOCKS THAT CAN BE BOUGHT
    // ----------------------------------------

    const affordable =
      stocks.filter(
        function (stock) {

          return stock.price <= amount;

        }
      );


    if (!affordable.length) {

      return [];

    }


    const targetCount =
      getTargetCount(
        amount,
        affordable.length
      );


    // ----------------------------------------
    // MAX SINGLE STOCK
    // ----------------------------------------

    let maxAllocation =
      amount *
      DEFAULT_MAX_STOCK_ALLOCATION;


    // Small budgets need flexibility
    if (amount < 5000) {

      maxAllocation =
        amount * 0.50;

    }


    // ----------------------------------------
    // SCORE
    // ----------------------------------------

    const candidates =
      affordable.map(
        function (
          stock,
          index
        ) {

          const rankBonus =
            (20 - index) *
            0.10;


          const momentumBonus =
            stock.change *
            0.40;


          return {

            ...stock,

            rank:
              index + 1,

            group:
              getSector(
                stock.symbol
              ),

            score:
              rankBonus +
              momentumBonus

          };

        }
      );


    candidates.sort(
      function (a, b) {

        return b.score - a.score;

      }
    );


    const selected = [];

    const usedSymbols =
      new Set();

    const groupCounts =
      new Map();


    // ========================================
    // PASS 1
    // DIFFERENT GROUPS
    // ========================================

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


      const group =
        stock.group ||
        "Nifty 50";


      const currentGroupCount =
        groupCounts.get(
          group
        ) || 0;


      // Prefer one stock from each group
      if (
        currentGroupCount >= 1
      ) {

        continue;

      }


      const remaining =
        amount -
        getTotalInvestment(
          selected
        );


      if (
        remaining <
        stock.price
      ) {

        continue;

      }


      const allowed =
        Math.min(
          remaining,
          maxAllocation
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


      addPosition(
        selected,
        stock,
        quantity
      );


      usedSymbols.add(
        stock.symbol
      );


      groupCounts.set(
        group,
        1
      );

    }


    // ========================================
    // PASS 2
    // ADD SECOND STOCK FROM GROUP IF NEEDED
    // ========================================

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


      const group =
        stock.group ||
        "Nifty 50";


      const currentGroupCount =
        groupCounts.get(
          group
        ) || 0;


      if (
        currentGroupCount >= 2
      ) {

        continue;

      }


      const remaining =
        amount -
        getTotalInvestment(
          selected
        );


      if (
        remaining <
        stock.price
      ) {

        continue;

      }


      const allowed =
        Math.min(
          remaining,
          maxAllocation
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


      addPosition(
        selected,
        stock,
        quantity
      );


      usedSymbols.add(
        stock.symbol
      );


      groupCounts.set(
        group,
        currentGroupCount + 1
      );

    }


    // ========================================
    // PASS 3
    // USE LEFTOVER MONEY
    // ========================================

    let changed = true;


    while (
      changed
    ) {

      changed = false;


      const total =
        getTotalInvestment(
          selected
        );


      const remaining =
        amount -
        total;


      if (
        remaining <= 0
      ) {

        break;

      }


      const rankedSelected =
        selected
          .slice()
          .sort(
            function (a, b) {

              return b.score - a.score;

            }
          );


      for (
        let i = 0;
        i < rankedSelected.length;
        i++
      ) {

        const stock =
          rankedSelected[i];


        // Do not allow any one stock
        // to dominate the portfolio.
        if (
          stock.investment +
          stock.price >
          maxAllocation
        ) {

          continue;

        }


        if (
          stock.price <=
          remaining
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
  // ADD POSITION
  // ==========================================

  function addPosition(
    selected,
    stock,
    quantity
  ) {

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

  function getTotalInvestment(
    selected
  ) {

    return selected.reduce(
      function (
        total,
        stock
      ) {

        return (
          total +
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
      `<div class="investment-summary">`;


    html +=
      `<div class="investment-title">
        Investment Plan
      </div>`;


    html +=
      `Amount: ₹${formatMoney(amount)}`;


    html += `<br>`;


    html +=
      `Selected Stocks: ${selected.length}`;


    html += `<br>`;


    html +=
      `Estimated Investment: ₹${formatMoney(
        totalInvestment
      )}`;


    html += `<br>`;


    html +=
      `Balance: ₹${formatMoney(
        balance
      )}`;


    html +=
      `</div>`;


    selected.forEach(
      function (
        stock,
        index
      ) {

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
            ${escapeHtml(
              stock.name
            )}
          </strong>`;


        html += `<br>`;


        html +=
          `<span>
            ${escapeHtml(
              stock.symbol
            )}
          </span>`;


        html += `<br>`;


        html +=
          `<span>
            ${stock.quantity}
            share${
              stock.quantity > 1
                ? "s"
                : ""
            }
          </span>`;


        html +=
          `<span
            class="${changeClass}"
            style="margin-left:8px;"
          >`;


        html +=
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;


        html += `</span>`;


        html += `<br>`;


        html +=
          `Price: ₹${formatMoney(
            stock.price
          )}`;


        html +=
          ` &nbsp; • &nbsp; `;


        html +=
          `Invest: ₹${formatMoney(
            stock.investment
          )}`;


        html +=
          `</div>`;

      }
    );


    html +=
      `<p style="
        margin-top:14px;
        line-height:1.6;
      ">`;


    html +=
      `₹${formatMoney(
        amount
      )} ke liye Top 20 mein se budget ke andar `;


    html +=
      `${selected.length} stock(s) mein diversified allocation calculate ki gayi hai.`;


    html += `<br>`;


    html +=
      `Total estimated investment ₹${formatMoney(
        totalInvestment
      )}.`;


    html += `<br>`;


    html +=
      `₹${formatMoney(
        balance
      )} balance bacha hai.`;


    html += `<br>`;


    html +=
      `Top 20 ranking, stock price aur diversification rules ko dhyan mein rakha gaya hai.`;


    html += `<br>`;


    html +=
      `Total investment entered amount se zyada nahi ho sakta.`;


    html += `<br>`;


    html +=
      `Ye calculation live market data aur prototype diversification rules par based hai. Investment ka final decision aapka hai.`;


    html +=
      `</p>`;


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
  // ESCAPE HTML
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


  // ==========================================
  // FINAL LOG
  // ==========================================

  console.log(
    "Prototype-1 app.js loaded successfully."
  );

  console.log(
    "Connect button is intentionally not controlled by app.js."
  );


})();
