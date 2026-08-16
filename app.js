// ============================================
// PROTOTYPE-1
// APP.JS
// SMART TOP-20 DIVERSIFICATION ENGINE
// ============================================

(function () {

  "use strict";

  console.log(
    "Prototype-1 app.js loading..."
  );


  // ==========================================
  // CONFIGURATION
  // ==========================================

  const MAX_PORTFOLIO_STOCKS = 10;

  const MAX_SINGLE_STOCK_PERCENT = 0.35;


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      console.log(
        "Prototype-1 app.js started."
      );


      const amountInput =
        document.getElementById(
          "amount"
        );


      const analyzeButton =
        document.getElementById(
          "analyzeButton"
        );


      const recommendation =
        document.getElementById(
          "recommendation"
        );


      if (
        !amountInput ||
        !analyzeButton ||
        !recommendation
      ) {

        console.error(
          "Prototype-1: Analyze elements not found."
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


          analyzeButton.disabled =
            true;


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

            analyzeButton.disabled =
              false;

          }

        }
      );

    }
  );


  // ==========================================
  // PUBLIC ANALYSIS FUNCTION
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
      // READ CURRENT TOP 20
      // ========================================

      let stocks =
        getCurrentTop20();


      // ========================================
      // FALLBACK TO LIVE MARKET DATA
      // ========================================

      if (
        !stocks.length
      ) {

        stocks =
          getMarketStocks();

      }


      stocks =
        stocks
          .map(
            normalizeStock
          )
          .filter(
            isValidStock
          );


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
      // TOP 20 RANKING ORDER
      // ========================================

      stocks.sort(
        function (a, b) {

          return (
            b.change -
            a.change
          );

        }
      );


      stocks =
        stocks.slice(
          0,
          20
        );


      // ========================================
      // BUILD DIVERSIFIED PORTFOLIO
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
            "Current Top 20 ke prices ke basis par is amount mein whole-share allocation nahi ban paaya."

        };

      }


      // ========================================
      // TOTAL INVESTMENT
      // ========================================

      let totalInvestment =
        selected.reduce(
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


      // ========================================
      // HARD SAFETY
      // ========================================

      if (
        totalInvestment >
        amount
      ) {

        totalInvestment =
          amount;

      }


      const balance =
        Math.max(
          0,
          amount -
          totalInvestment
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
  // CURRENT TOP 20
  // ==========================================

  function getCurrentTop20() {

    const possibleSources = [

      window.TOP_20_STOCKS,

      window.TOP20_STOCKS,

      window.REAL_TOP_20

    ];


    for (
      let i = 0;
      i < possibleSources.length;
      i++
    ) {

      if (
        Array.isArray(
          possibleSources[i]
        ) &&
        possibleSources[i].length
      ) {

        return possibleSources[i]
          .slice(
            0,
            20
          );

      }

    }


    return [];

  }


  // ==========================================
  // MARKET DATA FALLBACK
  // ==========================================

  function getMarketStocks() {

    const result =
      [];


    const market =
      window.MARKET_DATA;


    if (
      !market ||
      !market.stocks
    ) {

      return result;

    }


    // ----------------------------------------
    // ARRAY
    // ----------------------------------------

    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks
        .slice(
          0,
          20
        );

    }


    // ----------------------------------------
    // OBJECT
    // ----------------------------------------

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
              getSector(
                item.symbol ||
                key
              ),

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
      .slice(
        0,
        20
      );

  }


  // ==========================================
  // NORMALIZE STOCK
  // ==========================================

  function normalizeStock(
    stock
  ) {

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

      symbol:
        symbol,

      name:
        name,

      sector:
        String(
          stock.sector ||
          getSector(symbol)
        ),

      price:
        price,

      change:
        change

    };

  }


  // ==========================================
  // VALID STOCK
  // ==========================================

  function isValidStock(
    stock
  ) {

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
  // SECTOR / BUSINESS GROUP MAP
  // ==========================================

  function getSector(
    symbol
  ) {

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
          symbol ||
          ""
        )
          .toUpperCase()
      ] ||
      "Nifty 50"
    );

  }


  // ==========================================
  // TARGET STOCK COUNT
  // ==========================================

  function getTargetStockCount(
    amount,
    affordableCount
  ) {

    let count;


    if (
      amount < 1000
    ) {

      count =
        1;

    }

    else if (
      amount < 3000
    ) {

      count =
        2;

    }

    else if (
      amount < 5000
    ) {

      count =
        3;

    }

    else if (
      amount < 10000
    ) {

      count =
        4;

    }

    else if (
      amount < 20000
    ) {

      count =
        5;

    }

    else if (
      amount < 35000
    ) {

      count =
        6;

    }

    else if (
      amount < 50000
    ) {

      count =
        7;

    }

    else if (
      amount < 100000
    ) {

      count =
        8;

    }

    else {

      count =
        MAX_PORTFOLIO_STOCKS;

    }


    return Math.min(
      count,
      affordableCount,
      MAX_PORTFOLIO_STOCKS
    );

  }


  // ==========================================
  // BUILD DIVERSIFIED PORTFOLIO
  // ==========================================

  function buildDiversifiedPortfolio(
    stocks,
    amount
  ) {

    // ----------------------------------------
    // ONLY AFFORDABLE TOP 20 STOCKS
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


    const targetCount =
      getTargetStockCount(
        amount,
        affordable.length
      );


    // ----------------------------------------
    // MAX INITIAL ALLOCATION
    // ----------------------------------------

    let maxPerStock =
      amount *
      MAX_SINGLE_STOCK_PERCENT;


    if (
      amount < 5000
    ) {

      maxPerStock =
        amount *
        0.50;

    }


    // ----------------------------------------
    // CREATE SCORES
    // ----------------------------------------

    const candidates =
      affordable.map(
        function (
          stock,
          index
        ) {

          const rankBonus =
            Math.max(
              0,
              20 - index
            ) *
            0.08;


          const momentum =
            stock.change *
            0.35;


          const score =
            rankBonus +
            momentum;


          return {

            ...stock,

            rank:
              index + 1,

            score:
              score,

            group:
              getSector(
                stock.symbol
              )

          };

        }
      );


    candidates.sort(
      function (
        a,
        b
      ) {

        return (
          b.score -
          a.score
        );

      }
    );


    const selected =
      [];


    const selectedSymbols =
      new Set();


    const groupCounts =
      new Map();


    // ========================================
    // PASS 1
    // DIFFERENT SECTORS / GROUPS
    // ========================================

    for (
      let i = 0;

      i <
      candidates.length &&
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


      const group =
        stock.group ||
        "Nifty 50";


      const groupCount =
        groupCounts.get(
          group
        ) ||
        0;


      const allowedGroupCount =
        targetCount <= 3
          ? 1
          : 2;


      if (
        groupCount >=
        allowedGroupCount
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


      addPosition(
        selected,
        stock,
        quantity
      );


      selectedSymbols.add(
        stock.symbol
      );


      groupCounts.set(
        group,
        groupCount + 1
      );

    }


    // ========================================
    // PASS 2
    // FILL REMAINING SLOTS
    // ========================================

    for (
      let i = 0;

      i <
      candidates.length &&
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
        getTotalInvestment(
          selected
        );


      if (
        remaining <
        stock.price
      ) {

        continue;

      }


      const group =
        stock.group ||
        "Nifty 50";


      const groupCount =
        groupCounts.get(
          group
        ) ||
        0;


      if (
        groupCount >= 2
      ) {

        continue;

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


      addPosition(
        selected,
        stock,
        quantity
      );


      selectedSymbols.add(
        stock.symbol
      );


      groupCounts.set(
        group,
        groupCount + 1
      );

    }


    // ========================================
    // PASS 3
    // USE REMAINING MONEY
    // ========================================

    let changed =
      true;


    while (
      changed
    ) {

      changed =
        false;


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


      const ranked =
        selected
          .slice()
          .sort(
            function (
              a,
              b
            ) {

              return (
                b.score -
                a.score
              );

            }
          );


      for (
        let i = 0;

        i <
        ranked.length;

        i++
      ) {

        const stock =
          ranked[i];


        if (
          stock.investment +
          stock.price >
          amount *
          MAX_SINGLE_STOCK_PERCENT
        ) {

          continue;

        }


        if (
          stock.price <=
          remaining
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


    // ========================================
    // FINAL SAFETY
    // ========================================

    return selected.filter(
      function (
        stock
      ) {

        return (

          stock.quantity >
          0 &&

          stock.investment >
          0 &&

          stock.investment <=
          amount

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
  // TOTAL INVESTMENT
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
  // RECOMMENDATION
  // ==========================================

  function buildRecommendationHTML(
    amount,
    selected,
    totalInvestment,
    balance
  ) {

    let html =
      "";


    html +=
      '<div class="investment-summary">';


    html +=
      '<div class="investment-title">';
      
    html +=
      'Investment Plan';


    html +=
      '</div>';


    html +=
      `Amount: ₹${formatMoney(
        amount
      )}`;


    html +=
      `<br>`;


    html +=
      `Selected Stocks: ${
        selected.length
      }`;


    html +=
      `<br>`;


    html +=
      `Estimated Investment: ₹${
        formatMoney(
          totalInvestment
        )
      }`;


    html +=
      `<br>`;


    html +=
      `Balance: ₹${
        formatMoney(
          balance
        )
      }`;


    html +=
      '</div>';


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


        html +=
          `<br>`;


        html +=
          `<span>
            ${escapeHtml(
              stock.symbol
            )}
          </span>`;


        html +=
          `<br>`;


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
          `${stock.change >= 0 ? "+" : ""}${
            stock.change.toFixed(2)
          }%`;


        html +=
          `</span>`;


        html +=
          `<br>`;


        html +=
          `Price: ₹${
            formatMoney(
              stock.price
            )
          }`;


        html +=
          ` &nbsp; • &nbsp; `;


        html +=
          `Invest: ₹${
            formatMoney(
              stock.investment
            )
          }`;


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
      )} ke liye current Top 20 mein se budget ke andar `;


    html +=
      `${selected.length} stock(s) mein diversified allocation calculate ki gayi hai.`;


    html +=
      `<br>`;


    html +=
      `Total estimated investment ₹${
        formatMoney(
          totalInvestment
        )
      }.`;


    html +=
      `<br>`;


    html +=
      `₹${formatMoney(
        balance
      )} balance bacha hai.`;


    html +=
      `<br>`;


    html +=
      `Same sector/business-group concentration ko limit kiya gaya hai.`;


    html +=
      `<br>`;


    html +=
      `Total investment entered amount se zyada nahi ho sakta.`;


    html +=
      `<br>`;


    html +=
      `Ye calculation live market data, current ranking aur prototype diversification rules par based hai. `;


    html +=
      `Investment ka final decision aapka hai.`;


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
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2

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


  console.log(
    "Prototype-1 app.js loaded successfully. Connect controller untouched."
  );

})();
