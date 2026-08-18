// ============================================
// PROTOTYPE-1
// APP ENGINE V3
// LIVE MARKET DATA + RANK WEIGHTED
// + PRACTICAL DIVERSIFICATION
// + WHOLE SHARE OPTIMIZATION
// + FINAL ALLOCATION VALIDATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js V3 loading...");


  // ==========================================
  // DIVERSIFICATION LIMITS
  // ==========================================

  const MAX_STOCK_ALLOCATION = 0.35;

  // Practical limit.
  // Isko hard limit se lower rakha gaya hai.
  const PRACTICAL_MAX_STOCK = 0.20;

  const MAX_SECTOR_ALLOCATION = 0.40;

  const MAX_GROUP_ALLOCATION = 0.30;


  let isConnecting = false;


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

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
              await window.fetchMarketData(
                totp
              );


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
                window.MARKET_DATA.received ||
                0
              );


            const requested =
              Number(
                window.MARKET_DATA.requested ||
                50
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

            }

            else {

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
              "Investment analysis mein error aaya.";

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
      // EXISTING LIVE DATA
      // ========================================

      if (
        window.MARKET_DATA &&
        window.MARKET_DATA.success
      ) {

        renderTop20();

      }

    }
  );


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


      // ----------------------------------------
      // LIVE STOCK DATA
      // ----------------------------------------

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


      // ----------------------------------------
      // REMOVE DUPLICATE SYMBOLS
      // ----------------------------------------

      stocks =
        removeDuplicateStocks(stocks);


      // ----------------------------------------
      // LIVE RANKING
      // ----------------------------------------

      stocks.sort(function (a, b) {

        if (b.change !== a.change) {
          return b.change - a.change;
        }

        return a.price - b.price;

      });


      // ----------------------------------------
      // CURRENT TOP 20
      // ----------------------------------------

      const top20 =
        stocks.slice(0, 20);


      if (!top20.length) {

        return {

          success: false,

          message:
            "Current Top 20 market data available nahi hai."

        };

      }


      // ----------------------------------------
      // BUILD PLAN
      // ----------------------------------------

      const result =
        buildTop20BudgetPlan(
          top20,
          amount
        );


      // ----------------------------------------
      // FINAL SAFETY VALIDATION
      // ----------------------------------------

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
            "Allocation validation mein problem aayi. Console check karein.",

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
      Array.isArray(market.stocks)
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

      if (!stock || !stock.symbol) return;

      const symbol =
        String(
          stock.symbol
        )
          .replace(/-EQ$/i, "")
          .trim()
          .toUpperCase();


      if (!map.has(symbol)) {

        map.set(
          symbol,
          stock
        );

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
  // NIFTY MASTER LOOKUP
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
  // TOP 20 RENDER
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
          document.createElement(
            "div"
          );

        row.className =
          "stock";


        const left =
          document.createElement(
            "div"
          );

        left.className =
          "stock-left";


        const rank =
          document.createElement(
            "div"
          );

        rank.className =
          "rank";

        rank.textContent =
          String(index + 1);


        const info =
          document.createElement(
            "div"
          );


        const name =
          document.createElement(
            "div"
          );

        name.className =
          "stock-name";

        name.textContent =
          stock.name;


        const sector =
          document.createElement(
            "div"
          );

        sector.className =
          "stock-sector";

        sector.textContent =
          `${stock.symbol} • ${stock.sector}`;


        info.appendChild(name);

        info.appendChild(sector);

        left.appendChild(rank);

        left.appendChild(info);


        const right =
          document.createElement(
            "div"
          );

        right.className =
          "stock-change";


        const change =
          document.createElement(
            "div"
          );

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
          document.createElement(
            "div"
          );


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
  // V3 BUDGET PLAN
  // ==========================================

  function buildTop20BudgetPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;


    // ----------------------------------------
    // RANK WEIGHTS
    // #1 = count
    // Last = 1
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
    // CREATE ALL STOCKS
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
    // MAIN WHOLE-SHARE ALLOCATION
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
              balance
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
    // FINAL AFFORDABLE PASS
    // ========================================

    let secondPassGuard = 0;


    while (
      balance > 0 &&
      secondPassGuard < 5000
    ) {

      secondPassGuard++;


      const candidates =
        selected
          .filter(function (stock) {

            return canAddShare(
              stock,
              selected,
              budget,
              balance
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
    // FINAL CONCENTRATION
    // ========================================

    calculateConcentration(
      selected,
      total
    );


    // ========================================
    // TARGET GAP
    // ========================================

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
        getSectorTotals(
          selected
        ),

      groupTotals:
        getGroupTotals(
          selected
        )

    };

  }


  // ==========================================
  // CAN ADD SHARE
  // ==========================================

  function canAddShare(
    stock,
    selected,
    budget,
    balance
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


    // ----------------------------------------
    // BUDGET SAFETY
    // ----------------------------------------

    if (
      price >
      balance
    ) {

      return false;

    }


    const nextInvestment =
      stock.investment +
      price;


    // ----------------------------------------
    // HARD STOCK LIMIT
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
    // PRACTICAL STOCK LIMIT
    // ----------------------------------------

    const practicalMax =
      budget *
      PRACTICAL_MAX_STOCK;


    if (
      nextInvestment >
      practicalMax + 0.01
    ) {

      return false;

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


    // ----------------------------------------
    // RANK PRIORITY
    // ----------------------------------------

    const rankScore =
      stock.rankWeight /
      Math.max(
        1,
        selected.length
      );


    // ----------------------------------------
    // AFFORDABILITY
    // ----------------------------------------

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


    // ----------------------------------------
    // FIRST SHARE BONUS
    // ----------------------------------------

    let bonus = 0;


    if (
      stock.investment === 0
    ) {

      bonus += 0.35;

    }


    // ----------------------------------------
    // DIVERSIFICATION
    // ----------------------------------------

    const sectorTotals =
      getSectorTotals(
        selected
      );


    const groupTotals =
      getGroupTotals(
        selected
      );


    const currentSector =
      sectorTotals[
        stock.sector ||
        "Nifty 50"
      ] || 0;


    const currentGroup =
      groupTotals[
        stock.businessGroup ||
        stock.symbol
      ] || 0;


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


    // ----------------------------------------
    // FINAL SCORE
    // ----------------------------------------

    return (

      gapRatio * 5

      +

      rankScore * 2

      +

      affordability * 0.5

      +

      diversificationBonus * 0.4

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
  // FINAL CONCENTRATION
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
                  sectorTotals[
                    sector
                  ] || 0
                ) /
                total
              ) *
              100
            : 0;


        stock.groupPercent =
          total > 0
            ? (
                (
                  groupTotals[
                    group
                  ] || 0
                ) /
                total
              ) *
              100
            : 0;

      }
    );

  }


  // ==========================================
  // ALLOCATION VALIDATION
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


    // ----------------------------------------
    // TOTAL MUST NEVER EXCEED BUDGET
    // ----------------------------------------

    if (
      total >
      budget + 0.01
    ) {

      errors.push(
        `Investment ₹${total.toFixed(2)} exceeds budget ₹${budget.toFixed(2)}.`
      );

    }


    // ----------------------------------------
    // BALANCE SAFETY
    // ----------------------------------------

    if (
      balance < -0.01
    ) {

      errors.push(
        "Remaining balance became negative."
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
          PRACTICAL_MAX_STOCK + 0.0001
        ) {

          errors.push(
            `${stock.symbol} exceeded practical stock limit.`
          );

        }


        if (
          stockPercent >
          MAX_STOCK_ALLOCATION + 0.0001
        ) {

          errors.push(
            `${stock.symbol} exceeded hard stock limit.`
          );

        }

      }
    );


    // ----------------------------------------
    // SECTOR LIMIT
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
          MAX_SECTOR_ALLOCATION + 0.0001
        ) {

          errors.push(
            `${sector} exceeded sector limit.`
          );

        }

      }
    );


    // ----------------------------------------
    // GROUP LIMIT
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
          MAX_GROUP_ALLOCATION + 0.0001
        ) {

          errors.push(
            `${group} exceeded group limit.`
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
  // ALLOCATION TEST ENGINE
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


      console.log(
        "======================================"
      );

      console.log(
        "PROTOTYPE-1 FINAL ALLOCATION TEST"
      );

      console.log(
        "======================================"
      );


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
          "❌ No live stocks available."
        );

        return;

      }


      const results = [];


      amounts.forEach(
        function (amount) {

          try {

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


            const row = {

              amount,

              invested:
                result.totalInvestment,

              balance:
                result.balance,

              stocks:
                result.selected.filter(
                  function (stock) {
                    return stock.quantity > 0;
                  }
                ).length,

              valid:
                validation.valid

            };


            results.push(row);


            if (
              validation.valid
            ) {

              console.log(
                `✅ ₹${amount.toLocaleString("en-IN")} | Invested ₹${result.totalInvestment.toFixed(2)} | Balance ₹${result.balance.toFixed(2)} | Stocks ${row.stocks}`
              );

            }

            else {

              console.error(
                `❌ ₹${amount.toLocaleString("en-IN")}`,
                validation.errors
              );

            }

          }

          catch (error) {

            console.error(
              `❌ ₹${amount} test crashed`,
              error
            );

          }

        }
      );


      console.log(
        "======================================"
      );

      console.table(
        results
      );

      console.log(
        "ALLOCATION TEST COMPLETED"
      );

      console.log(
        "======================================"
      );


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


    // ========================================
    // SUMMARY
    // ========================================

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
        Top 20 Rank-Weighted Practical
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
      `Allocation method:
      <strong>
        Live Rank-Weighted %
      </strong>
      <br>`;


    html +=
      `Rank weight:
      <strong>
        #1 = ${top20.length}
        → #${top20.length} = 1
      </strong>
      <br>`;


    html +=
      `Practical stock limit:
      <strong>
        ${(PRACTICAL_MAX_STOCK * 100).toFixed(0)}%
      </strong>
      <br>`;


    html +=
      `Actual whole-share investment:
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

      "Rank Weight",

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


       
