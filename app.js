// ============================================
// PROTOTYPE-1
// APP ENGINE V4
// LIVE MARKET DATA
// + RANK WEIGHTED
// + SMART DIVERSIFICATION
// + WHOLE SHARE OPTIMIZATION
// + SMALL BUDGET SUPPORT
// + FINAL VALIDATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js V4 loading...");

  // ==========================================
  // SAFETY LIMITS
  // ==========================================

  const MAX_STOCK_ALLOCATION = 0.35;
  const PRACTICAL_MAX_STOCK = 0.20;
  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  let isConnecting = false;


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener("DOMContentLoaded", function () {

    const amountInput =
      document.getElementById("amount");

    const totpInput =
      document.getElementById("totp");

    const connectButton =
      document.getElementById("connectButton");

    const analyzeButton =
      document.getElementById("analyzeButton");

    const recommendation =
      document.getElementById("recommendation");


    if (
      !amountInput ||
      !totpInput ||
      !connectButton ||
      !analyzeButton ||
      !recommendation
    ) {
      console.error(
        "Required Prototype-1 elements not found."
      );
      return;
    }


    // ========================================
    // CONNECT LIVE MARKET DATA
    // ========================================

    connectButton.addEventListener(
      "click",
      async function () {

        if (isConnecting) return;

        const totp =
          String(
            totpInput.value || ""
          ).trim();

        hideError();

        if (!/^\d{6}$/.test(totp)) {

          showError(
            "Please current 6-digit Kotak Neo TOTP enter karein."
          );

          setMarketStatus(
            "WAITING",
            "status-pending"
          );

          return;
        }

        if (
          typeof window.fetchMarketData !==
          "function"
        ) {

          showError(
            "Market data engine load nahi hua. Page refresh karke dobara try karein."
          );

          return;
        }

        isConnecting = true;

        connectButton.disabled = true;
        analyzeButton.disabled = true;

        connectButton.textContent =
          "Connecting...";

        setMarketStatus(
          "CONNECTING...",
          "status-pending"
        );

        try {

          const success =
            await window.fetchMarketData(totp);

          if (!success) {

            const message =
              window.MARKET_DATA &&
              window.MARKET_DATA.error
                ? window.MARKET_DATA.error
                : "Live market data connect nahi ho paya.";

            showError(message);

            setMarketStatus(
              "ERROR",
              "status-error"
            );

            return;
          }

          const received =
            Number(
              window.MARKET_DATA.received || 0
            );

          const requested =
            Number(
              window.MARKET_DATA.requested || 50
            );

          setMarketStatus(
            `LIVE • ${received}/${requested}`,
            "status-ready"
          );

          renderTop20();

          recommendation.innerHTML =
            `Live market data connected successfully. ${received}/${requested} stocks received.`;

          console.log(
            `Live market data connected: ${received}/${requested}`
          );

        }

        catch (error) {

          console.error(
            "Connect error:",
            error
          );

          showError(
            error && error.message
              ? error.message
              : "Live market data connect nahi ho paya."
          );

          setMarketStatus(
            "ERROR",
            "status-error"
          );

        }

        finally {

          isConnecting = false;

          connectButton.disabled = false;
          analyzeButton.disabled = false;

          connectButton.textContent =
            "Connect Live Market Data";

        }

      }
    );


    // ========================================
    // ANALYZE INVESTMENT
    // ========================================

    analyzeButton.addEventListener(
      "click",
      function () {

        hideError();

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
              result && result.message
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
            `
              <div style="
                padding:14px;
                border-radius:10px;
                background:#111820;
                color:#fff;
              ">
                <strong>Analysis error</strong>
                <br>
                ${escapeHtml(
                  error && error.message
                    ? error.message
                    : "Unknown error"
                )}
              </div>
            `;

        }

      }
    );


    // ========================================
    // ENTER SUPPORT
    // ========================================

    amountInput.addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Enter") {
          analyzeButton.click();
        }

      }
    );


    totpInput.addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Enter") {
          connectButton.click();
        }

      }
    );


    // ========================================
    // EXISTING MARKET DATA
    // ========================================

    if (
      window.MARKET_DATA &&
      window.MARKET_DATA.success
    ) {

      renderTop20();

    }

  });


  // ==========================================
  // MAIN ANALYSIS
  // ==========================================

  window.analyzeInvestmentAmount =
    function (amount) {

      amount = Number(amount);

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


      let stocks =
        getStocksFromMarketData()
          .map(normalizeStock)
          .filter(isValidStock);


      if (!stocks.length) {

        return {
          success: false,
          message:
            "Pehle Connect Live Market Data karke live quotes load karein."
        };

      }


      stocks =
        removeDuplicateStocks(stocks);


      stocks.sort(function (a, b) {

        if (b.change !== a.change) {
          return b.change - a.change;
        }

        return a.price - b.price;

      });


      const top20 =
        stocks.slice(0, 20);


      if (!top20.length) {

        return {
          success: false,
          message:
            "Current Top 20 market data available nahi hai."
        };

      }


      const result =
        buildTop20BudgetPlan(
          top20,
          amount
        );


      const validation =
        validateAllocation(
          result,
          amount
        );


      if (!validation.valid) {

        console.error(
          "Allocation validation failed:",
          validation.errors
        );

        return {
          success: false,
          message:
            "Allocation validation mein problem aayi.",
          errors:
            validation.errors
        };

      }


      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            top20,
            result
          ),

        selectedStocks:
          result.selected,

        totalInvestment:
          result.totalInvestment,

        balance:
          result.balance,

        top20:
          top20

      };

    };


  // ==========================================
  // MARKET DATA
  // ==========================================

  function getStocksFromMarketData() {

    const market =
      window.MARKET_DATA;

    if (
      !market ||
      !market.stocks
    ) {
      return [];
    }

    if (
      Array.isArray(
        market.stocks
      )
    ) {
      return market.stocks;
    }

    if (
      typeof market.stocks !== "object"
    ) {
      return [];
    }

    const result = [];

    Object.keys(
      market.stocks
    ).forEach(function (key) {

      const item =
        market.stocks[key];

      if (!item) return;

      result.push({

        symbol:
          item.symbol ||
          item.neoSymbol ||
          key,

        name:
          item.name ||
          item.companyName ||
          item.displaySymbol ||
          key,

        sector:
          item.sector ||
          item.industry ||
          "",

        businessGroup:
          item.businessGroup ||
          item.group ||
          item.parentGroup ||
          "",

        price:
          item.price ??
          item.ltp ??
          item.lastPrice ??
          item.close ??
          0,

        change:
          item.perChange ??
          item.change ??
          item.percentChange ??
          0

      });

    });

    return result;

  }


  // ==========================================
  // REMOVE DUPLICATES
  // ==========================================

  function removeDuplicateStocks(stocks) {

    const map = new Map();

    stocks.forEach(function (stock) {

      if (
        !stock ||
        !stock.symbol
      ) {
        return;
      }

      const symbol =
        String(
          stock.symbol
        )
          .replace(/-EQ$/i, "")
          .trim()
          .toUpperCase();

      if (!map.has(symbol)) {
        map.set(symbol, stock);
      }

    });

    return Array.from(
      map.values()
    );

  }


  // ==========================================
  // NORMALIZE STOCK
  // ==========================================

  function normalizeStock(stock) {

    stock = stock || {};

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


    const master =
      findNiftyStock(symbol);


    const name =
      String(
        stock.name ||
        stock.companyName ||
        (
          master &&
          master.name
        ) ||
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
        stock.perChange ??
        stock.change ??
        stock.percentChange ??
        0
      );


    const sector =
      String(
        stock.sector ||
        (
          master &&
          master.sector
        ) ||
        "Nifty 50"
      ).trim();


    const businessGroup =
      String(
        stock.businessGroup ||
        stock.group ||
        stock.parentGroup ||
        (
          master &&
          (
            master.businessGroup ||
            master.group
          )
        ) ||
        inferBusinessGroup(symbol)
      ).trim();


    return {

      symbol,
      name,
      sector,
      businessGroup,
      price,
      change

    };

  }


  // ==========================================
  // NIFTY MASTER
  // ==========================================

  function findNiftyStock(symbol) {

    const list =
      Array.isArray(
        window.NIFTY_50_STOCKS
      )
        ? window.NIFTY_50_STOCKS
        : [];


    for (
      let i = 0;
      i < list.length;
      i++
    ) {

      const item =
        list[i];


      if (
        String(
          item.symbol || ""
        )
          .replace(/-EQ$/i, "")
          .toUpperCase() === symbol
      ) {

        return item;

      }

    }


    return null;

  }


  // ==========================================
  // BUSINESS GROUP FALLBACK
  // ==========================================

  function inferBusinessGroup(symbol) {

    const groups = {

      ADANIENT:
        "Adani Group",

      ADANIPORTS:
        "Adani Group",

      HDFCBANK:
        "HDFC Group",

      HDFCLIFE:
        "HDFC Group",

      ICICIBANK:
        "ICICI Group",

      ICICIPRULI:
        "ICICI Group",

      BAJFINANCE:
        "Bajaj Group",

      BAJAJ_AUTO:
        "Bajaj Group",

      RELIANCE:
        "Reliance Group",

      TATAMOTORS:
        "Tata Group",

      TATASTEEL:
        "Tata Group",

      TCS:
        "Tata Group",

      TITAN:
        "Tata Group",

      TRENT:
        "Tata Group",

      LT:
        "Larsen Group",

      SBIN:
        "SBI Group"

    };


    return (
      groups[symbol] ||
      symbol
    );

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
  // TOP 20
  // ==========================================

  function renderTop20() {

    const list =
      document.getElementById(
        "top20List"
      );


    if (!list) return;


    let stocks =
      getStocksFromMarketData()
        .map(normalizeStock)
        .filter(isValidStock);


    stocks =
      removeDuplicateStocks(
        stocks
      );


    stocks =
      stocks
        .sort(function (a, b) {

          return b.change - a.change;

        })
        .slice(0, 20);


    if (!stocks.length) {

      list.innerHTML =
        '<p class="note">Live market data available nahi hai.</p>';

      return;

    }


    const fragment =
      document.createDocumentFragment();


    stocks.forEach(
      function (stock, index) {

        const row =
          document.createElement("div");

        row.className =
          "stock";


        const left =
          document.createElement("div");

        left.className =
          "stock-left";


        const rank =
          document.createElement("div");

        rank.className =
          "rank";

        rank.textContent =
          String(index + 1);


        const info =
          document.createElement("div");


        const name =
          document.createElement("div");

        name.className =
          "stock-name";

        name.textContent =
          stock.name;


        const sector =
          document.createElement("div");

        sector.className =
          "stock-sector";

        sector.textContent =
          `${stock.symbol} • ${stock.sector}`;


        info.appendChild(name);
        info.appendChild(sector);

        left.appendChild(rank);
        left.appendChild(info);


        const right =
          document.createElement("div");

        right.className =
          "stock-change";


        const change =
          document.createElement("div");

        change.className =
          stock.change >= 0
            ? "positive"
            : "negative";


        change.textContent =
          `${
            stock.change >= 0
              ? "+"
              : ""
          }${stock.change.toFixed(2)}%`;


        const price =
          document.createElement("div");


        price.textContent =
          `₹${formatMoney(
            stock.price
          )}`;


        right.appendChild(change);
        right.appendChild(price);

        row.appendChild(left);
        row.appendChild(right);

        fragment.appendChild(row);

      }
    );


    list.replaceChildren(
      fragment
    );

  }


  // ==========================================
  // SMART BUDGET PLAN
  // ==========================================

  function buildTop20BudgetPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;


    // ----------------------------------------
    // RANK WEIGHTS
    // ----------------------------------------

    const rankWeights =
      stocks.map(
        function (stock, index) {

          return {

            symbol:
              stock.symbol,

            rank:
              index + 1,

            weight:
              count - index

          };

        }
      );


    const weightTotal =
      rankWeights.reduce(
        function (sum, item) {

          return (
            sum +
            item.weight
          );

        },
        0
      );


    const targets = {};


    rankWeights.forEach(
      function (item) {

        targets[item.symbol] =
          item.weight /
          weightTotal;

      }
    );


    // ----------------------------------------
    // CREATE STOCK ARRAY
    // ----------------------------------------

    const selected =
      stocks.map(
        function (stock, index) {

          const targetPercent =
            targets[stock.symbol];


          return {

            ...stock,

            rank:
              index + 1,

            rankWeight:
              rankWeights[index].weight,

            targetPercent:
              targetPercent * 100,

            targetAmount:
              budget *
              targetPercent,

            quantity:
              0,

            investment:
              0,

            actualPercent:
              0,

            sectorPercent:
              0,

            groupPercent:
              0

          };

        }
      );


    let total = 0;

    let balance = budget;

    let guard = 0;


    // ========================================
    // PASS 1
    //
    // Smart diversification.
    // ========================================

    while (
      balance > 0 &&
      guard < 10000
    ) {

      guard++;


      const candidates =
        selected
          .filter(function (stock) {

            return canAddShare(
              stock,
              selected,
              budget,
              balance,
              true
            );

          })
          .map(function (stock) {

            return {

              stock,

              score:
                calculateAllocationScore(
                  stock,
                  selected,
                  budget
                )

            };

          })
          .sort(function (a, b) {

            return b.score - a.score;

          });


      if (!candidates.length) {
        break;
      }


      const chosen =
        candidates[0].stock;


      chosen.quantity += 1;

      chosen.investment +=
        chosen.price;

      total +=
        chosen.price;

      balance =
        Math.max(
          0,
          budget - total
        );

    }


    // ========================================
    // PASS 2
    //
    // Relax practical limit ONLY when
    // necessary for small budgets.
    // ========================================

    if (
      balance > 0
    ) {

      let relaxedGuard = 0;


      while (
        balance > 0 &&
        relaxedGuard < 5000
      ) {

        relaxedGuard++;


        const candidates =
          selected
            .filter(function (stock) {

              return canAddShare(
                stock,
                selected,
                budget,
                balance,
                false
              );

            })
            .map(function (stock) {

              return {

                stock,

                score:
                  calculateAllocationScore(
                    stock,
                    selected,
                    budget
                  )

              };

            })
            .sort(function (a, b) {

              return b.score - a.score;

            });


        if (!candidates.length) {
          break;
        }


        const chosen =
          candidates[0].stock;


        chosen.quantity += 1;

        chosen.investment +=
          chosen.price;

        total +=
          chosen.price;

        balance =
          Math.max(
            0,
            budget - total
          );

      }

    }


    // ========================================
    // FINAL CONCENTRATION
    // ========================================

    calculateConcentration(
      selected,
      total
    );


    selected.forEach(
      function (stock) {

        stock.targetGap =
          stock.targetAmount -
          stock.investment;

      }
    );


    return {

      selected,

      totalInvestment:
        total,

      balance,

      top20Count:
        count,

      targetPercentages:
        targets,

      rankWeights,

      weightTotal,

      sectorTotals:
        getSectorTotals(selected),

      groupTotals:
        getGroupTotals(selected)

    };

  }


  // ==========================================
  // CAN ADD SHARE
  // ==========================================

  function canAddShare(
    stock,
    selected,
    budget,
    balance,
    strictPractical
  ) {

    const price =
      Number(
        stock.price
      );


    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return false;
    }


    // Never exceed remaining budget.
    if (
      price >
      balance + 0.01
    ) {
      return false;
    }


    const nextInvestment =
      stock.investment +
      price;


    // ----------------------------------------
    // HARD 35% LIMIT ALWAYS ACTIVE
    // ----------------------------------------

    const hardMax =
      budget *
      MAX_STOCK_ALLOCATION;


    if (
      nextInvestment >
      hardMax + 0.01
    ) {
      return false;
    }


    // ----------------------------------------
    // PRACTICAL LIMIT
    //
    // First pass strict.
    // Second pass can relax it.
    // ----------------------------------------

    if (strictPractical) {

      const practicalMax =
        budget *
        PRACTICAL_MAX_STOCK;


      if (
        nextInvestment >
        practicalMax + 0.01
      ) {

        return false;

      }

    }


    // ----------------------------------------
    // SECTOR LIMIT
    // ----------------------------------------

    const sectorTotals =
      getSectorTotals(
        selected
      );


    const sector =
      stock.sector ||
      "Nifty 50";


    const nextSector =
      (
        sectorTotals[sector] ||
        0
      ) +
      price;


    const sectorMax =
      budget *
      MAX_SECTOR_ALLOCATION;


    if (
      nextSector >
      sectorMax + 0.01
    ) {

      return false;

    }


    // ----------------------------------------
    // GROUP LIMIT
    // ----------------------------------------

    const groupTotals =
      getGroupTotals(
        selected
      );


    const group =
      stock.businessGroup ||
      stock.symbol;


    const nextGroup =
      (
        groupTotals[group] ||
        0
      ) +
      price;


    const groupMax =
      budget *
      MAX_GROUP_ALLOCATION;


    if (
      nextGroup >
      groupMax + 0.01
    ) {

      return false;

    }


    return true;

  }


  // ==========================================
  // ALLOCATION SCORE
  // ==========================================

  function calculateAllocationScore(
    stock,
    selected,
    budget
  ) {

    const target =
      stock.targetAmount;


    const current =
      stock.investment;


    const gap =
      Math.max(
        0,
        target - current
      );


    const gapRatio =
      target > 0
        ? gap / target
        : 0;


    // Rank priority.
    const rankScore =
      stock.rankWeight /
      Math.max(
        1,
        selected.length
      );


    // Affordable stocks get some preference.
    const affordability =
      budget > 0
        ? Math.min(
            1,
            budget /
            (
              stock.price *
              10
            )
          )
        : 0;


    // First-share bonus.
    let bonus = 0;


    if (
      stock.investment === 0
    ) {

      bonus += 0.35;

    }


    const sectorTotals =
      getSectorTotals(
        selected
      );


    const groupTotals =
      getGroupTotals(
        selected
      );


    const sector =
      stock.sector ||
      "Nifty 50";


    const group =
      stock.businessGroup ||
      stock.symbol;


    const currentSector =
      sectorTotals[sector] || 0;


    const currentGroup =
      groupTotals[group] || 0;


    const sectorRatio =
      currentSector /
      Math.max(
        budget,
        1
      );


    const groupRatio =
      currentGroup /
      Math.max(
        budget,
        1
      );


    const diversificationBonus =
      (
        1 -
        sectorRatio
      ) +
      (
        1 -
        groupRatio
      );


    // Cheaper stock preference for
    // small-budget diversification.
    const pricePreference =
      budget > 0
        ? Math.min(
            1,
            budget /
            Math.max(
              stock.price * 5,
              1
            )
          )
        : 0;


    return (

      gapRatio * 5

      +

      rankScore * 2

      +

      affordability * 0.6

      +

      pricePreference * 0.7

      +

      diversificationBonus * 0.5

      +

      bonus

    );

  }


  // ==========================================
  // SECTOR TOTALS
  // ==========================================

  function getSectorTotals(
    stocks
  ) {

    const totals = {};


    stocks.forEach(
      function (stock) {

        const sector =
          stock.sector ||
          "Nifty 50";


        totals[sector] =
          (
            totals[sector] ||
            0
          ) +
          Number(
            stock.investment ||
            0
          );

      }
    );


    return totals;

  }


  // ==========================================
  // GROUP TOTALS
  // ==========================================

  function getGroupTotals(
    stocks
  ) {

    const totals = {};


    stocks.forEach(
      function (stock) {

        const group =
          stock.businessGroup ||
          stock.symbol;


        totals[group] =
          (
            totals[group] ||
            0
          ) +
          Number(
            stock.investment ||
            0
          );

      }
    );


    return totals;

  }


  // ==========================================
  // CONCENTRATION
  // ==========================================

  function calculateConcentration(
    stocks,
    total
  ) {

    const sectorTotals =
      getSectorTotals(
        stocks
      );


    const groupTotals =
      getGroupTotals(
        stocks
      );


    stocks.forEach(
      function (stock) {

        stock.actualPercent =
          total > 0
            ? (
                stock.investment /
                total
              ) *
              100
            : 0;


        const sector =
          stock.sector ||
          "Nifty 50";


        const group =
          stock.businessGroup ||
          stock.symbol;


        stock.sectorPercent =
          total > 0
            ? (
                (
                  sectorTotals[sector] ||
                  0
                ) /
                total
              ) *
              100
            : 0;


        stock.groupPercent =
          total > 0
            ? (
                (
                  groupTotals[group] ||
                  0
                ) /
                total
              ) *
              100
            : 0;

      }
    );

  }


  // ==========================================
  // FINAL VALIDATION
  // ==========================================

  function validateAllocation(
    result,
    budget
  ) {

    const errors = [];


    if (!result) {

      errors.push(
        "No allocation result."
      );

      return {
        valid: false,
        errors
      };

    }


    const total =
      Number(
        result.totalInvestment ||
        0
      );


    const balance =
      Number(
        result.balance ||
        0
      );


    if (
      total >
      budget + 0.01
    ) {

      errors.push(
        "Investment exceeded budget."
      );

    }


    if (
      balance < -0.01
    ) {

      errors.push(
        "Balance became negative."
      );

    }


    // ----------------------------------------
    // STOCK LIMIT
    // ----------------------------------------

    result.selected.forEach(
      function (stock) {

        const stockPercent =
          budget > 0
            ? stock.investment /
              budget
            : 0;


        if (
          stockPercent >
          MAX_STOCK_ALLOCATION +
          0.0001
        ) {

          errors.push(
            `${stock.symbol} exceeded 35% stock limit.`
          );

        }

      }
    );


    // ----------------------------------------
    // SECTOR
    // ----------------------------------------

    Object.keys(
      result.sectorTotals || {}
    ).forEach(
      function (sector) {

        const percent =
          budget > 0
            ? result.sectorTotals[sector] /
              budget
            : 0;


        if (
          percent >
          MAX_SECTOR_ALLOCATION +
          0.0001
        ) {

          errors.push(
            `${sector} exceeded 40% sector limit.`
          );

        }

      }
    );


    // ----------------------------------------
    // GROUP
    // ----------------------------------------

    Object.keys(
      result.groupTotals || {}
    ).forEach(
      function (group) {

        const percent =
          budget > 0
            ? result.groupTotals[group] /
              budget
            : 0;


        if (
          percent >
          MAX_GROUP_ALLOCATION +
          0.0001
        ) {

          errors.push(
            `${group} exceeded 30% group limit.`
          );

        }

      }
    );


    return {

      valid:
        errors.length === 0,

      errors

    };

  }


  // ==========================================
  // TEST FUNCTION
  // ==========================================

  window.runAllocationTests =
    function () {

      const amounts = [

        5000,
        10000,
        25000,
        50000,
        100000,
        500000,
        1000000

      ];


      const market =
        getStocksFromMarketData()
          .map(normalizeStock)
          .filter(isValidStock);


      const unique =
        removeDuplicateStocks(
          market
        );


      unique.sort(function (a, b) {

        return b.change - a.change;

      });


      const top20 =
        unique.slice(0, 20);


      if (!top20.length) {

        console.error(
          "❌ No live market data available."
        );

        return [];

      }


      const results = [];


      amounts.forEach(
        function (amount) {

          const result =
            buildTop20BudgetPlan(
              top20,
              amount
            );


          const validation =
            validateAllocation(
              result,
              amount
            );


          const investedStocks =
            result.selected.filter(
              function (stock) {

                return stock.quantity > 0;

              }
            );


          const row = {

            amount,

            invested:
              result.totalInvestment,

            balance:
              result.balance,

            stocks:
              investedStocks.length,

            valid:
              validation.valid

          };


          results.push(row);


          if (
            validation.valid
          ) {

            console.log(
              `✅ ₹${amount.toLocaleString("en-IN")} | Invested ₹${result.totalInvestment.toFixed(2)} | Balance ₹${result.balance.toFixed(2)} | Stocks ${investedStocks.length}`
            );

          }

          else {

            console.error(
              `❌ ₹${amount.toLocaleString("en-IN")}`,
              validation.errors
            );

          }

        }
      );


      console.table(results);


      return results;

    };


  // ==========================================
  // RECOMMENDATION HTML
  // ==========================================

  function buildRecommendationHTML(
    budget,
    top20,
    result
  ) {

    let html = "";


    html +=
      `<div
        class="investment-summary"
        style="
          padding:14px;
          margin-bottom:14px;
          border-radius:10px;
          background:#111820;
        "
      >`;


    html +=
      `<div class="investment-title">
        Top 20 Rank-Weighted Smart
        Diversification Plan
      </div>`;


    html +=
      `<div
        style="
          line-height:1.8;
          margin-top:8px;
        "
      >`;


    html +=
      `Budget:
      <strong>
        ₹${formatMoney(budget)}
      </strong>
      <br>`;


    html +=
      `Current Top 20:
      <strong>
        ${top20.length} companies
      </strong>
      <br>`;


    html +=
      `Allocation:
      <strong>
        Rank-Weighted + Smart Diversification
      </strong>
      <br>`;


    html +=
      `Whole-share investment:
      <strong>
        ₹${formatMoney(
          result.totalInvestment
        )}
      </strong>
      <br>`;


    html +=
      `Remaining balance:
      <strong>
        ₹${formatMoney(
          result.balance
        )}
      </strong>
      <br>`;


    html +=
      `Stocks selected:
      <strong>
        ${
          result.selected.filter(
            function (stock) {
              return stock.quantity > 0;
            }
          ).length
        }
      </strong>`;


    html +=
      `</div>`;


    html +=
      `</div>`;


    // ========================================
    // TABLE
    // ========================================

    html +=
      `<div
        style="
          overflow-x:auto;
          margin-top:12px;
        "
      >`;


    html +=
      `<table
        style="
          width:100%;
          border-collapse:collapse;
          min-width:1100px;
          font-size:13px;
        "
      >`;


    html +=
      `<thead>
        <tr>`;


    const headers = [

      "Rank",
      "Company",
      "Price",
      "Weight",
      "Target %",
      "Target ₹",
      "Shares",
      "Actual ₹",
      "Actual %",
      "Sector",
      "Sector %",
      "Group",
      "Group %"

    ];


    headers.forEach(
      function (header) {

        html +=
          `<th
            style="
              text-align:left;
              padding:9px;
              border-bottom:
                1px solid #39424e;
              white-space:nowrap;
            "
          >
            ${header}
          </th>`;

      }
    );


    html +=
      `</tr>
      </thead>`;


    html +=
      `<tbody>`;


    result.selected.forEach(
      function (stock) {

        const actualClass =
          stock.quantity > 0
            ? "positive"
            : "negative";


        html +=
          `<tr>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ${stock.rank}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            <strong>
              ${escapeHtml(
                stock.name
              )}
            </strong>
            <br>
            <small>
              ${escapeHtml(
                stock.symbol
              )}
            </small>
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ₹${formatMoney(
              stock.price
            )}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ${stock.rankWeight}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ${stock.targetPercent.toFixed(2)}%
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ₹${formatMoney(
              stock.targetAmount
            )}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            <strong>
              ${stock.quantity}
            </strong>
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ₹${formatMoney(
              stock.investment
            )}
          </td>`;


        html +=
          `<td
            class="${actualClass}"
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.actualPercent.toFixed(2)}%
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ${escapeHtml(
              stock.sector
            )}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ${stock.sectorPercent.toFixed(2)}%
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ${escapeHtml(
              stock.businessGroup
            )}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:
              1px solid #252d38;
          ">
            ${stock.groupPercent.toFixed(2)}%
          </td>`;


        html +=
          `</tr>`;

      }
    );


    html +=
      `</tbody>
      </table>
      </div>`;


    // ========================================
    // LOGIC EXPLANATION
    // ========================================

    html +=
      `<div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.7;
        "
      >`;


    html +=
      `<strong>
        Allocation Logic
      </strong>
      <br>`;


    html +=
      `• Current Top 20 live market ranking
      ke basis par select kiya gaya hai.
      <br>`;


    html +=
      `• Higher-ranked stocks ko higher
      allocation priority milti hai.
      <br>`;


    html +=
      `• Whole shares hi use kiye jaate hain.
      <br>`;


    html +=
      `• Stock par hard safety limit
      ${(MAX_STOCK_ALLOCATION * 100).toFixed(0)}%
      hai.
      <br>`;


    html +=
      `• Normal situation mein practical
      stock target
      ${(PRACTICAL_MAX_STOCK * 100).toFixed(0)}%
      rakha jata hai.
      <br>`;


    html +=
      `• Small budget mein agar 20% rule
      share purchase ko impossible banata hai,
      engine practical rule ko relax kar sakta hai,
      lekin hard
      ${(MAX_STOCK_ALLOCATION * 100).toFixed(0)}%
      safety limit cross nahi karta.
      <br>`;


    html +=
      `• Sector limit
      ${(MAX_SECTOR_ALLOCATION * 100).toFixed(0)}%
      hai.
      <br>`;


    html +=
      `• Business group limit
      ${(MAX_GROUP_ALLOCATION * 100).toFixed(0)}%
      hai.
      <br>`;


    html +=
      `• Budget kabhi exceed nahi hoga.
      <br>`;


    html +=
      `• Whole-share pricing ke कारण kuch
      balance unused reh sakta hai.
      <br>`;


    html +=
      `• Ye live market data aur prototype
      allocation rules par based calculation hai;
      investment decision final nahi hai.`;


    html +=
      `</div>`;


    // ========================================
    // FINAL SUMMARY
    // ========================================

    html +=
      `<div
        style="
          margin-top:14px;
          padding:14px;
          border-top:
            1px solid #39424e;
          line-height:1.8;
        "
      >`;


    html +=
      `<strong>
        Final Summary
      </strong>
      <br>`;


    html +=
      `Budget:
      ₹${formatMoney(budget)}
      <br>`;


    html +=
      `Invested:
      ₹${formatMoney(
        result.totalInvestment
      )}
      <br>`;


    html +=
      `Balance:
      ₹${formatMoney(
        result.balance
      )}
      <br>`;


    html +=
      `Top-20 considered:
      ${result.top20Count}
      <br>`;


    html +=
      `Selected:
      ${
        result.selected.filter(
          function (stock) {
            return stock.quantity > 0;
          }
        ).length
      } stocks
      <br>`;


    html +=
      `Stock safety limit:
      ${(MAX_STOCK_ALLOCATION * 100).toFixed(0)}%
      <br>`;


    html +=
      `Sector limit:
      ${(MAX_SECTOR_ALLOCATION * 100).toFixed(0)}%
      <br>`;


    html +=
      `Group limit:
      ${(MAX_GROUP_ALLOCATION * 100).toFixed(0)}%`;


    html +=
      `</div>`;


    html +=
      `<div
        style="
          margin-top:12px;
          font-size:12px;
          opacity:0.8;
        "
      >
        Prototype-1 AI analysis based on available data.
        Investment ka final decision aapka hai.
      </div>`;


    return html;

  }


  // ==========================================
  // STATUS
  // ==========================================

  function setMarketStatus(
    text,
    className
  ) {

    const marketStatus =
      document.getElementById(
        "marketStatus"
      );


    if (!marketStatus) return;


    marketStatus.textContent =
      text;


    marketStatus.className =
      className;

  }


  // ==========================================
  // ERROR
  // ==========================================

  function showError(message) {

    const box =
      document.getElementById(
        "errorBox"
      );


    if (!box) return;


    box.textContent =
      String(
        message ||
        "Unknown error"
      );


    box.style.display =
      "block";

  }


  function hideError() {

    const box =
      document.getElementById(
        "errorBox"
      );


    if (!box) return;


    box.textContent =
      "";


    box.style.display =
      "none";

  }


  // ==========================================
  // MONEY
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
    "Prototype-1 app.js V4 loaded successfully."
  );

})();
