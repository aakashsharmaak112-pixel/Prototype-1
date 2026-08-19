// ============================================================
// PROTOTYPE-1 — APP ENGINE V5.3
// MONTHLY TOP-20
// DAILY MONITORING
// DETERIORATION / WATCH / EXIT REVIEW
// REPLACEMENT CANDIDATE ENGINE
// SMART WHOLE-SHARE ALLOCATION
// INVESTMENT + PORTFOLIO TRACKING
//
// CORE RULE
// ------------------------------------------------------------
// Investment decision  : MONTHLY TOP-20
// Monitoring frequency : DAILY / CONTINUOUS
// Automatic BUY/SELL   : NEVER
// Replacement          : REVIEW ALERT ONLY
// ============================================================

(function () {
  "use strict";

  console.log("Prototype-1 app.js V5.3 loading...");

  // ==========================================================
  // SETTINGS
  // ==========================================================

  const TARGET_TOP20 = 20;

  const NORMAL_MAX_STOCK = 0.20;
  const SMALL_BUDGET_MAX_STOCK = 0.25;
  const HARD_MAX_STOCK = 0.35;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const MIN_DIVERSIFIED_STOCKS = 5;

  const PORTFOLIO_KEY =
    "prototype1_portfolio_v5";

  const MONTHLY_KEY =
    "prototype1_monthly_top20_v5";

  const DAILY_KEY =
    "prototype1_daily_monitoring_v5";

  const DAILY_HISTORY_LIMIT = 31;

  // Existing Top-20 stock:
  // weak outside Top-20 for at least this many
  // actual monitoring dates before EXIT REVIEW.
  const EXIT_REVIEW_MIN_WEAK_DAYS = 2;

  // Last N dates are used for deterioration/candidate analysis.
  const ANALYSIS_LOOKBACK_DAYS = 3;

  // Replacement candidate must have at least this
  // many confirmed Top-20 dates in lookback.
  const REPLACEMENT_MIN_TOP20_DAYS = 2;

  // Maximum candidate list shown.
  const MAX_REPLACEMENT_RESULTS = 5;

  let isConnecting = false;


  // ==========================================================
  // DOM READY
  // ==========================================================

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


      // ========================================================
      // CONNECT LIVE DATA
      // ========================================================

      connectButton.addEventListener(
        "click",
        async function () {

          if (isConnecting) {
            return;
          }

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


            // Monitoring update only.
            // Monthly Top-20 is never overwritten here.
            runMonitoring();

            renderTop20();


            recommendation.innerHTML =
              `Live market data connected successfully. ${received}/${requested} stocks received.`;


            console.log(
              `Live market data connected: ${received}/${requested}`
            );


          } catch (error) {

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


          } finally {

            isConnecting = false;

            connectButton.disabled = false;
            analyzeButton.disabled = false;

            connectButton.textContent =
              "Connect Live Market Data";
          }
        }
      );


      // ========================================================
      // ANALYZE INVESTMENT
      // ========================================================

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

            // Update monitoring first.
            runMonitoring();


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


              // Monitoring / alerts appended separately.
              appendMonitoringToRecommendation();


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


      // ========================================================
      // ENTER KEYS
      // ========================================================

      amountInput.addEventListener(
        "keydown",
        function (event) {

          if (
            event.key === "Enter"
          ) {

            analyzeButton.click();
          }
        }
      );


      totpInput.addEventListener(
        "keydown",
        function (event) {

          if (
            event.key === "Enter"
          ) {

            connectButton.click();
          }
        }
      );


      // ========================================================
      // EXISTING MARKET DATA
      // ========================================================

      if (
        window.MARKET_DATA &&
        window.MARKET_DATA.success
      ) {

        runMonitoring();
        renderTop20();
      }

    }
  );


  // ==========================================================
  // MAIN INVESTMENT ANALYSIS
  // ==========================================================

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


      const stocks =
        getStocksFromMarketData()
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


      const ranked =
        smartRankStocks(
          stocks
        );


      // ========================================================
      // MONTHLY BASELINE
      // ========================================================

      let monthly =
        getSavedMonthly();


      if (
        !monthly ||
        monthly.month !==
        currentMonthKey()
      ) {

        monthly =
          createMonthlyTop20(
            ranked
          );
      }


      /*
       * IMPORTANT:
       * Investment uses monthly symbols only.
       *
       * Daily ranking cannot replace them.
       */

      const monthlyStocks =
        monthly.symbols
          .map(
            function (symbol) {

              return ranked.find(
                function (stock) {

                  return (
                    stock.symbol ===
                    symbol
                  );
                }
              );
            }
          )
          .filter(Boolean);


      let top20 =
        monthlyStocks.slice(
          0,
          TARGET_TOP20
        );


      /*
       * Safety fallback only when local monthly data
       * is genuinely missing/corrupt.
       */

      if (
        !top20.length
      ) {

        monthly =
          createMonthlyTop20(
            ranked
          );


        top20 =
          monthly.symbols
            .map(
              function (symbol) {

                return ranked.find(
                  function (stock) {

                    return (
                      stock.symbol ===
                      symbol
                    );
                  }
                );
              }
            )
            .filter(Boolean)
            .slice(
              0,
              TARGET_TOP20
            );
      }


      const result =
        buildSmartPlan(
          top20,
          amount
        );


      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            top20,
            result,
            monthly
          ),

        selectedStocks:
          result.selected.filter(
            function (stock) {

              return (
                stock.quantity > 0
              );
            }
          ),

        totalInvestment:
          result.totalInvestment,

        balance:
          result.balance,

        top20,

        monthlyTop20:
          monthly.symbols

      };
    };


  // ==========================================================
  // SMART RANKING
  // ==========================================================

  function smartRankStocks(
    stocks
  ) {

    return stocks

      .map(
        function (stock) {

          const master =
            findNiftyStock(
              stock.symbol
            );


          const change =
            Number(
              stock.change || 0
            );


          const momentum =
            Math.max(
              -5,
              Math.min(
                5,
                change
              )
            );


          const priority =
            master &&
            Number.isFinite(
              Number(
                master.priority
              )
            )
              ? Number(
                  master.priority
                )
              : 0;


          return {

            ...stock,

            engineScore:
              change +
              momentum * 0.10 +
              priority * 0.001

          };

        }
      )

      .sort(
        function (
          a,
          b
        ) {

          return (
            b.engineScore -
            a.engineScore
          );

        }
      );

  }


  // ==========================================================
  // MARKET DATA
  // ==========================================================

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
      typeof market.stocks !==
      "object"
    ) {

      return [];
    }


    return Object.keys(
      market.stocks
    ).map(
      function (key) {

        const item =
          market.stocks[key] ||
          {};


        return {

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
            0,

          chartScore:
            item.chartScore ??
            item.technicalScore,

          fundamentalScore:
            item.fundamentalScore,

          newsScore:
            item.newsScore

        };

      }
    );

  }


  // ==========================================================
  // NORMALIZE
  // ==========================================================

  function normalizeStock(
    stock
  ) {

    stock =
      stock ||
      {};


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


    const master =
      findNiftyStock(
        symbol
      );


    return {

      ...stock,

      symbol,

      name:
        String(
          stock.name ||
          stock.companyName ||
          (
            master &&
            master.name
          ) ||
          stock.displaySymbol ||
          symbol
        ).trim(),

      price:
        Number(
          stock.price ??
          stock.ltp ??
          stock.lastPrice ??
          stock.close ??
          0
        ),

      change:
        Number(
          stock.perChange ??
          stock.change ??
          stock.percentChange ??
          0
        ),

      sector:
        String(
          stock.sector ||
          (
            master &&
            master.sector
          ) ||
          "Nifty 50"
        ).trim(),

      businessGroup:
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
          inferBusinessGroup(
            symbol
          )
        ).trim()

    };
  }


  // ==========================================================
  // NIFTY MASTER
  // ==========================================================

  function findNiftyStock(
    symbol
  ) {

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
        list[i] ||
        {};


      const itemSymbol =
        String(
          item.symbol ||
          ""
        )
          .replace(
            /-EQ$/i,
            ""
          )
          .toUpperCase();


      if (
        itemSymbol ===
        symbol
      ) {

        return item;
      }
    }


    return null;
  }


  // ==========================================================
  // BUSINESS GROUP
  // ==========================================================

  function inferBusinessGroup(
    symbol
  ) {

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

      BAJAJFINSV:
        "Bajaj Group",

      "BAJAJ-AUTO":
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


  // ==========================================================
  // VALID STOCK
  // ==========================================================

  function isValidStock(
    stock
  ) {

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


  // ==========================================================
  // CURRENT MONTH
  // ==========================================================

  function currentMonthKey() {

    const d =
      new Date();


    return (
      d.getFullYear() +
      "-" +
      String(
        d.getMonth() + 1
      ).padStart(
        2,
        "0"
      )
    );
  }


  // ==========================================================
  // MONTHLY STORAGE
  // ==========================================================

  function getSavedMonthly() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            MONTHLY_KEY
          ) || "null"
        );


      if (
        saved &&
        saved.month ===
        currentMonthKey() &&
        Array.isArray(
          saved.symbols
        ) &&
        saved.symbols.length
      ) {

        return saved;
      }


    } catch (error) {

      console.warn(
        "Monthly memory read failed",
        error
      );
    }


    return null;
  }


  function createMonthlyTop20(
    ranked
  ) {

    const symbols =
      ranked
        .slice(
          0,
          TARGET_TOP20
        )
        .map(
          function (stock) {

            return stock.symbol;
          }
        );


    const monthly = {

      month:
        currentMonthKey(),

      symbols,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()

    };


    saveMonthly(
      monthly
    );


    console.log(
      "New monthly Top-20 created:",
      symbols
    );


    return monthly;
  }


  function saveMonthly(
    data
  ) {

    try {

      localStorage.setItem(
        MONTHLY_KEY,
        JSON.stringify(
          data
        )
      );


    } catch (error) {

      console.warn(
        "Monthly data save failed",
        error
      );
    }
  }


  // ==========================================================
  // WHOLE SHARE SMART PLAN
  // ==========================================================

  function buildSmartPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;


    if (
      !count
    ) {

      return {

        selected: [],

        totalInvestment:
          0,

        balance:
          budget
      };
    }


    const weightTotal =
      stocks.reduce(
        function (
          sum,
          stock,
          index
        ) {

          return (
            sum +
            (
              count -
              index
            )
          );

        },
        0
      );


    const selected =
      stocks.map(
        function (
          stock,
          index
        ) {

          const weight =
            count -
            index;


          const target =
            weight /
            weightTotal;


          return {

            ...stock,

            rank:
              index + 1,

            rankWeight:
              weight,

            targetPercent:
              target * 100,

            targetAmount:
              budget *
              target,

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


    let total =
      0;


    // --------------------------------------------------------
    // FIRST DIVERSIFICATION
    // --------------------------------------------------------

    const candidates =
      selected
        .filter(
          function (stock) {

            return (
              stock.price <=
              budget
            );
          }
        )
        .sort(
          function (
            a,
            b
          ) {

            const ar =
              a.rankWeight /
              Math.max(
                a.price,
                1
              );


            const br =
              b.rankWeight /
              Math.max(
                b.price,
                1
              );


            return (
              br -
              ar
            );
          }
        );


    for (
      const stock of candidates
    ) {

      if (
        countSelected(
          selected
        ) >=
        Math.min(
          MIN_DIVERSIFIED_STOCKS,
          count
        )
      ) {

        break;
      }


      if (
        canAdd(
          stock,
          selected,
          budget,
          budget -
          total
        )
      ) {

        stock.quantity++;

        stock.investment +=
          stock.price;

        total +=
          stock.price;
      }
    }


    // --------------------------------------------------------
    // WHOLE SHARE OPTIMIZATION
    // --------------------------------------------------------

    let guard =
      0;


    while (
      guard++ <
      20000
    ) {

      const balance =
        budget -
        total;


      if (
        balance <= 0
      ) {

        break;
      }


      const possible =
        selected
          .filter(
            function (
              stock
            ) {

              return canAdd(
                stock,
                selected,
                budget,
                balance
              );
            }
          )
          .map(
            function (
              stock
            ) {

              return {

                stock,

                score:
                  allocationScore(
                    stock,
                    selected,
                    budget,
                    balance
                  )

              };

            }
          )
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


      if (
        !possible.length
      ) {

        break;
      }


      const chosen =
        possible[0].stock;


      chosen.quantity++;

      chosen.investment +=
        chosen.price;

      total +=
        chosen.price;
    }


    calculateConcentration(
      selected,
      total
    );


    return {

      selected,

      totalInvestment:
        total,

      balance:
        Math.max(
          0,
          budget -
          total
        )
    };
  }


  // ==========================================================
  // CAN ADD
  // ==========================================================

  function canAdd(
    stock,
    selected,
    budget,
    balance
  ) {

    if (
      !stock ||
      stock.price >
      balance
    ) {

      return false;
    }


    let stockLimit =
      NORMAL_MAX_STOCK;


    if (
      stock.investment === 0 &&
      stock.price <=
      budget *
      SMALL_BUDGET_MAX_STOCK
    ) {

      stockLimit =
        SMALL_BUDGET_MAX_STOCK;
    }


    const maxStock =
      Math.min(
        HARD_MAX_STOCK,
        stockLimit
      ) *
      budget;


    if (
      stock.investment +
      stock.price >
      maxStock +
      0.000001
    ) {

      return false;
    }


    const sector =
      stock.sector ||
      "Nifty 50";


    const group =
      stock.businessGroup ||
      stock.symbol;


    const sectorTotal =
      getSectorTotals(
        selected
      )[sector] || 0;


    const groupTotal =
      getGroupTotals(
        selected
      )[group] || 0;


    if (
      sectorTotal +
      stock.price >
      budget *
      MAX_SECTOR_ALLOCATION +
      0.000001
    ) {

      return false;
    }


    if (
      groupTotal +
      stock.price >
      budget *
      MAX_GROUP_ALLOCATION +
      0.000001
    ) {

      return false;
    }


    return true;
  }


  // ==========================================================
  // ALLOCATION SCORE
  // ==========================================================

  function allocationScore(
    stock,
    selected,
    budget,
    balance
  ) {

    const target =
      Math.max(
        stock.targetAmount,
        1
      );


    const gap =
      Math.max(
        0,
        target -
        stock.investment
      );


    const gapScore =
      Math.min(
        2,
        gap /
        target
      );


    const rankScore =
      stock.rankWeight /
      Math.max(
        selected.length,
        1
      );


    const sector =
      stock.sector ||
      "Nifty 50";


    const group =
      stock.businessGroup ||
      stock.symbol;


    const sectorRatio =
      (
        getSectorTotals(
          selected
        )[sector] || 0
      ) /
      Math.max(
        budget,
        1
      );


    const groupRatio =
      (
        getGroupTotals(
          selected
        )[group] || 0
      ) /
      Math.max(
        budget,
        1
      );


    const diversification =
      (
        1 -
        sectorRatio
      ) +
      (
        1 -
        groupRatio
      );


    const utilization =
      stock.price <=
      balance

        ? stock.price /
          Math.max(
            balance,
            1
          )

        : 0;


    const momentum =
      Math.max(
        -3,
        Math.min(
          3,
          Number(
            stock.change ||
            0
          )
        )
      );


    return (

      gapScore * 5 +

      rankScore * 2.5 +

      diversification * 1.5 +

      utilization * 1.2 +

      momentum * 0.15

    );
  }


  // ==========================================================
  // CONCENTRATION
  // ==========================================================

  function getSectorTotals(
    stocks
  ) {

    const totals =
      {};


    stocks.forEach(
      function (
        stock
      ) {

        const key =
          stock.sector ||
          "Nifty 50";


        totals[key] =
          (
            totals[key] ||
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


  function getGroupTotals(
    stocks
  ) {

    const totals =
      {};


    stocks.forEach(
      function (
        stock
      ) {

        const key =
          stock.businessGroup ||
          stock.symbol;


        totals[key] =
          (
            totals[key] ||
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


  function calculateConcentration(
    stocks,
    total
  ) {

    const sectors =
      getSectorTotals(
        stocks
      );


    const groups =
      getGroupTotals(
        stocks
      );


    stocks.forEach(
      function (
        stock
      ) {

        stock.actualPercent =
          total > 0
            ? (
                stock.investment /
                total *
                100
              )
            : 0;


        stock.sectorPercent =
          total > 0
            ? (
                (
                  sectors[
                    stock.sector
                  ] || 0
                ) /
                total *
                100
              )
            : 0;


        stock.groupPercent =
          total > 0
            ? (
                (
                  groups[
                    stock.businessGroup
                  ] || 0
                ) /
                total *
                100
              )
            : 0;

      }
    );
  }


  function countSelected(
    stocks
  ) {

    return stocks.filter(
      function (
        stock
      ) {

        return (
          stock.quantity >
          0
        );

      }
    ).length;
  }


  // ==========================================================
  // CURRENT DAILY TOP-20
  // ==========================================================

  function renderTop20() {

    const list =
      document.getElementById(
        "top20List"
      );


    if (!list) {
      return;
    }


    const stocks =
      smartRankStocks(
        getStocksFromMarketData()
          .map(
            normalizeStock
          )
          .filter(
            isValidStock
          )
      )
        .slice(
          0,
          TARGET_TOP20
        );


    if (
      !stocks.length
    ) {

      list.innerHTML =
        '<p class="note">Live market data available nahi hai.</p>';

      return;
    }


    const fragment =
      document.createDocumentFragment();


    stocks.forEach(
      function (
        stock,
        index
      ) {

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
          index + 1;


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


        info.appendChild(
          name
        );


        info.appendChild(
          sector
        );


        left.appendChild(
          rank
        );


        left.appendChild(
          info
        );


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
          }${stock.change.toFixed(
            2
          )}%`;


        const price =
          document.createElement(
            "div"
          );


        price.textContent =
          `₹${formatMoney(
            stock.price
          )}`;


        right.appendChild(
          change
        );


        right.appendChild(
          price
        );


        row.appendChild(
          left
        );


        row.appendChild(
          right
        );


        fragment.appendChild(
          row
        );

      }
    );


    list.replaceChildren(
      fragment
    );
  }


  // ==========================================================
  // DAILY MONITORING ENGINE
  // ==========================================================

  function runMonitoring() {

    const stocks =
      smartRankStocks(
        getStocksFromMarketData()
          .map(
            normalizeStock
          )
          .filter(
            isValidStock
          )
      );


    if (
      !stocks.length
    ) {

      return {

        success: false,

        monitored: [],

        replacementAlerts: []

      };
    }


    // ========================================================
    // MONTHLY MEMORY
    // ========================================================

    let monthly =
      getSavedMonthly();


    if (!monthly) {

      monthly =
        createMonthlyTop20(
          stocks
        );
    }


    // ========================================================
    // DAILY SNAPSHOT
    // ========================================================

    const today =
      localDateKey();


    const snapshot =
      stocks.map(
        function (
          stock,
          index
        ) {

          return {

            symbol:
              stock.symbol,

            dailyRank:
              index + 1,

            change:
              stock.change,

            price:
              stock.price
          };

        }
      );


    const history =
      getDailyHistory();


    // IMPORTANT:
    // One calendar day = one historical snapshot.
    // Re-running monitoring during the same day updates
    // that date instead of creating fake extra days.

    const todayIndex =
      history.findIndex(
        function (
          item
        ) {

          return (
            item &&
            item.date ===
            today
          );
        }
      );


    if (
      todayIndex >= 0
    ) {

      history[
        todayIndex
      ].data =
        snapshot;

      history[
        todayIndex
      ].updatedAt =
        new Date().toISOString();

    } else {

      history.push({

        date:
          today,

        updatedAt:
          new Date().toISOString(),

        data:
          snapshot

      });
    }


    const trimmedHistory =
      history
        .slice(
          -DAILY_HISTORY_LIMIT
        );


    saveDailyHistory(
      trimmedHistory
    );


    // ========================================================
    // BASE MONITORING
    // ========================================================

    const monitored =
      stocks.map(
        function (
          stock,
          index
        ) {

          const monthlyRank =
            monthly.symbols.indexOf(
              stock.symbol
            ) + 1;


          const dailyRank =
            index + 1;


          let status =
            "MONITOR";


          let reason =
            "Daily monitoring continue hai.";


          // --------------------------------------------------
          // EXISTING MONTHLY TOP-20
          // --------------------------------------------------

          if (
            monthlyRank > 0
          ) {

            if (
              dailyRank <=
              TARGET_TOP20
            ) {

              status =
                "HOLD";


              reason =
                "Monthly Top-20 mein hai; daily fluctuation normal hai.";

            } else {

              status =
                "WATCH";


              reason =
                "Daily ranking Top-20 se bahar hai; monthly investment decision automatically change nahi hoga.";
            }


            // Meaningful improvement only.
            if (
              dailyRank <
                monthlyRank &&
              dailyRank <=
                TARGET_TOP20
            ) {

              status =
                "IMPROVING";


              reason =
                "Daily position monthly position se improve hui hai.";
            }


            // Persistent deterioration.
            const deterioration =
              getDeteriorationStatus(
                stock.symbol,
                monthlyRank,
                trimmedHistory
              );


            if (
              deterioration.exitReview
            ) {

              status =
                "EXIT REVIEW";


              reason =
                deterioration.reason;

            } else if (
              deterioration.watch
            ) {

              status =
                "WATCH";


              reason =
                deterioration.reason;
            }


          // --------------------------------------------------
          // OUTSIDE MONTHLY TOP-20
          // --------------------------------------------------

          } else {

            status =
              "MONITOR";


            reason =
              "Monthly Top-20 ke bahar hai; replacement monitoring continue hai.";
          }


          return {

            symbol:
              stock.symbol,

            name:
              stock.name,

            monthlyRank,

            dailyRank,

            status,

            reason,

            change:
              stock.change,

            price:
              stock.price
          };

        }
      );


    // ========================================================
    // REPLACEMENT ALERTS
    // ========================================================

    const replacementAlerts =
      buildReplacementAlerts(
        stocks,
        monthly,
        monitored,
        trimmedHistory
      );


    // ========================================================
    // SAVE FINAL MONITORING
    // ========================================================

    saveDailyMonitoring(
      trimmedHistory,
      monitored,
      replacementAlerts
    );


    return {

      success: true,

      month:
        currentMonthKey(),

      monthlyTop20:
        monthly.symbols,

      currentDailyTop20:
        stocks
          .slice(
            0,
            TARGET_TOP20
          )
          .map(
            s =>
              s.symbol
          ),

      monitored,

      replacementAlerts,

      history:
        trimmedHistory

    };
  }


  // ==========================================================
  // DETERIORATION ENGINE
  // ==========================================================

  function getDeteriorationStatus(
    symbol,
    monthlyRank,
    history
  ) {

    const recent =
      history
        .slice(
          -ANALYSIS_LOOKBACK_DAYS
        );


    const observations =
      recent
        .map(
          function (
            day
          ) {

            if (
              !day ||
              !Array.isArray(
                day.data
              )
            ) {

              return null;
            }


            return day.data.find(
              function (
                item
              ) {

                return (
                  item.symbol ===
                  symbol
                );
              }
            );
          }
        )
        .filter(
          Boolean
        );


    if (
      !observations.length
    ) {

      return {

        weakDays: 0,

        exitReview: false,

        watch: false,

        reason:
          "Daily monitoring history abhi insufficient hai."
      };
    }


    const ranks =
      observations
        .map(
          item =>
            Number(
              item.dailyRank
            )
        )
        .filter(
          Number.isFinite
        );


    const weakDays =
      ranks.filter(
        rank =>
          rank >
          TARGET_TOP20
      ).length;


    const currentRank =
      ranks.length
        ? ranks[
            ranks.length - 1
          ]
        : 999;


    const firstRank =
      ranks.length
        ? ranks[0]
        : 999;


    const averageRank =
      ranks.length
        ? ranks.reduce(
            (
              sum,
              rank
            ) =>
              sum + rank,
            0
          ) /
          ranks.length
        : 999;


    const worseningTrend =
      ranks.length >= 2 &&
      currentRank >
        firstRank;


    const significantDrop =
      Number.isFinite(
        monthlyRank
      ) &&
      currentRank -
        monthlyRank >=
        10;


    /*
     * EXIT REVIEW:
     * - at least 2 actual weak dates
     * AND
     * - clear deterioration severity.
     *
     * This avoids EXIT REVIEW from a single bad day.
     */

    const exitReview =
      weakDays >=
        EXIT_REVIEW_MIN_WEAK_DAYS &&
      (
        currentRank >= 25 ||
        significantDrop ||
        averageRank >= 25
      );


    const watch =
      weakDays >= 1;


    let reason =
      "Daily monitoring normal hai.";


    if (
      exitReview
    ) {

      reason =
        `${symbol} mein persistent deterioration confirm hui: ${weakDays} recent weak day(s), current daily rank #${currentRank}, monthly rank #${monthlyRank}. Detailed EXIT REVIEW required.`;

    } else if (
      watch
    ) {

      reason =
        `${symbol} current daily Top-20 se bahar hai. Abhi WATCH mode hai; single-day movement par exit decision nahi hoga.`;

    } else if (
      worseningTrend
    ) {

      reason =
        `${symbol} mein relative weakness observe ho rahi hai, lekin exit confirmation abhi sufficient nahi hai.`;

    }


    return {

      weakDays,

      currentRank,

      averageRank,

      worseningTrend,

      exitReview,

      watch,

      reason

    };
  }


  // ==========================================================
  // REPLACEMENT ENGINE
  // ==========================================================

  function buildReplacementAlerts(
    stocks,
    monthly,
    monitored,
    history
  ) {

    // --------------------------------------------------------
    // Find monthly members that are genuinely weak.
    // --------------------------------------------------------

    const weakHeldStocks =
      monitored
        .filter(
          function (
            item
          ) {

            return (
              item.monthlyRank > 0 &&
              (
                item.status ===
                "WATCH" ||
                item.status ===
                "EXIT REVIEW"
              ) &&
              item.dailyRank >
              TARGET_TOP20
            );
          }
        )
        .map(
          function (
            item
          ) {

            return {

              ...item,

              deterioration:
                getDeteriorationStatus(
                  item.symbol,
                  item.monthlyRank,
                  history
                )

            };
          }
        )
        .sort(
          function (
            a,
            b
          ) {

            const aSeverity =
              replacementRiskScore(
                a
              );


            const bSeverity =
              replacementRiskScore(
                b
              );


            return (
              bSeverity -
              aSeverity
            );
          }
        );


    if (
      !weakHeldStocks.length
    ) {

      return [];
    }


    // --------------------------------------------------------
    // Find outside candidates that have actual confirmation.
    // --------------------------------------------------------

    const candidates =
      stocks
        .filter(
          function (
            stock
          ) {

            return (
              monthly.symbols.indexOf(
                stock.symbol
              ) === -1
            );
          }
        )
        .map(
          function (
            stock
          ) {

            return evaluateReplacementCandidate(
              stock,
              history
            );
          }
        )
        .filter(
          function (
            candidate
          ) {

            return (
              candidate.confirmed
            );
          }
        )
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


    if (
      !candidates.length
    ) {

      return [];
    }


    // --------------------------------------------------------
    // Pair the strongest candidate with the weakest
    // monthly member(s).
    // --------------------------------------------------------

    const alerts = [];


    weakHeldStocks.forEach(
      function (
        held,
        heldIndex
      ) {

        const candidate =
          candidates[
            Math.min(
              heldIndex,
              candidates.length - 1
            )
          ];


        if (
          !candidate
        ) {
          return;
        }


        const rankAdvantage =
          held.dailyRank -
          candidate.currentRank;


        /*
         * Candidate must have a meaningful relative
         * advantage OR the held stock must already be
         * in EXIT REVIEW.
         */

        const meaningful =
          rankAdvantage >= 3 ||
          held.status ===
            "EXIT REVIEW";


        if (
          !meaningful
        ) {
          return;
        }


        alerts.push({

          currentStock: {

            symbol:
              held.symbol,

            name:
              held.name,

            monthlyRank:
              held.monthlyRank,

            dailyRank:
              held.dailyRank,

            status:
              held.status,

            weakDays:
              held.deterioration.weakDays,

            reason:
              held.reason

          },

          candidate: {

            symbol:
              candidate.symbol,

            name:
              candidate.name,

            currentRank:
              candidate.currentRank,

            averageRank:
              candidate.averageRank,

            confirmedTop20Days:
              candidate.confirmedTop20Days,

            improvingTrend:
              candidate.improvingTrend,

            change:
              candidate.change,

            price:
              candidate.price,

            score:
              candidate.score

          },

          rankAdvantage,

          recommendation:
            "REVIEW RECOMMENDED"

        });
      }
    );


    return alerts
      .slice(
        0,
        MAX_REPLACEMENT_RESULTS
      );
  }


  function evaluateReplacementCandidate(
    stock,
    history
  ) {

    const recent =
      history.slice(
        -ANALYSIS_LOOKBACK_DAYS
      );


    const observations =
      recent
        .map(
          function (
            day
          ) {

            if (
              !day ||
              !Array.isArray(
                day.data
              )
            ) {

              return null;
            }


            return day.data.find(
              function (
                item
              ) {

                return (
                  item.symbol ===
                  stock.symbol
                );
              }
            );
          }
        )
        .filter(
          Boolean
        );


    const ranks =
      observations
        .map(
          item =>
            Number(
              item.dailyRank
            )
        )
        .filter(
          Number.isFinite
        );


    const currentRank =
      ranks.length
        ? ranks[
            ranks.length - 1
          ]
        : 999;


    const averageRank =
      ranks.length
        ? ranks.reduce(
            (
              sum,
              rank
            ) =>
              sum + rank,
            0
          ) /
          ranks.length
        : 999;


    const confirmedTop20Days =
      ranks.filter(
        rank =>
          rank <=
          TARGET_TOP20
      ).length;


    const improvingTrend =
      ranks.length >= 2 &&
      ranks[
        ranks.length - 1
      ] <
      ranks[0];


    const stableTop20 =
      confirmedTop20Days >=
      REPLACEMENT_MIN_TOP20_DAYS;


    /*
     * Candidate should be:
     * - currently Top-20
     * - seen in Top-20 on multiple real dates
     * - preferably improving or stable.
     */

    const confirmed =
      currentRank <=
      TARGET_TOP20 &&
      stableTop20 &&
      (
        improvingTrend ||
        averageRank <= 15
      );


    /*
     * Score rewards:
     * - current rank
     * - average rank
     * - confirmed Top-20 dates
     * - improving trend
     */

    let score =
      0;


    if (
      currentRank <=
      TARGET_TOP20
    ) {

      score +=
        (
          TARGET_TOP20 -
          currentRank +
          1
        ) *
        4;
    }


    if (
      averageRank <
      999
    ) {

      score +=
        Math.max(
          0,
          (
            TARGET_TOP20 -
            averageRank
          )
        ) *
        2;
    }


    score +=
      confirmedTop20Days *
      5;


    if (
      improvingTrend
    ) {

      score +=
        5;
    }


    return {

      symbol:
        stock.symbol,

      name:
        stock.name,

      currentRank,

      averageRank,

      confirmedTop20Days,

      improvingTrend,

      confirmed,

      score,

      change:
        stock.change,

      price:
        stock.price

    };
  }


  function replacementRiskScore(
    item
  ) {

    let score =
      0;


    if (
      item.status ===
      "EXIT REVIEW"
    ) {

      score +=
        20;
    }


    if (
      item.dailyRank >
      TARGET_TOP20
    ) {

      score +=
        item.dailyRank -
        TARGET_TOP20;
    }


    score +=
      Number(
        item.deterioration &&
        item.deterioration.weakDays ||
        0
      ) *
      5;


    return score;
  }


  // ==========================================================
  // LOCAL DATE
  // ==========================================================

  function localDateKey() {

    const d =
      new Date();


    return (
      d.getFullYear() +
      "-" +
      String(
        d.getMonth() + 1
      ).padStart(
        2,
        "0"
      ) +
      "-" +
      String(
        d.getDate()
      ).padStart(
        2,
        "0"
      )
    );
  }


  // ==========================================================
  // DAILY HISTORY STORAGE
  // ==========================================================

  function getDailyHistory() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            DAILY_KEY
          ) || "null"
        );


      if (
        saved &&
        Array.isArray(
          saved.history
        )
      ) {

        return saved.history;
      }


    } catch (error) {

      console.warn(
        "Daily history read failed",
        error
      );
    }


    return [];
  }


  function saveDailyHistory(
    history
  ) {

    try {

      const existing =
        JSON.parse(
          localStorage.getItem(
            DAILY_KEY
          ) || "null"
        );


      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({

          ...(existing || {}),

          updatedAt:
            new Date().toISOString(),

          history

        })
      );


    } catch (error) {

      console.warn(
        "Daily history save failed",
        error
      );
    }
  }


  function saveDailyMonitoring(
    history,
    monitored,
    replacementAlerts
  ) {

    try {

      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({

          date:
            new Date().toISOString(),

          history,

          data:
            monitored,

          replacementAlerts:
            replacementAlerts || []

        })
      );


    } catch (error) {

      console.warn(
        "Daily monitoring save failed",
        error
      );
    }
  }


  // ==========================================================
  // PORTFOLIO TRACKING
  // ==========================================================

  /*
   * IMPORTANT:
   *
   * Analyze = recommendation only.
   *
   * No automatic portfolio purchase is recorded.
   */

  function saveInvestmentPlan() {

    console.warn(
      "Analyze-only flow: automatic portfolio purchase is disabled."
    );

    return false;
  }


  function getPortfolio() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            PORTFOLIO_KEY
          ) || "null"
        );


      if (
        saved &&
        Array.isArray(
          saved.positions
        )
      ) {

        return saved;
      }


    } catch (error) {

      console.warn(
        "Portfolio read failed",
        error
      );
    }


    return {

      positions: [],

      totalInvested:
        0,

      updatedAt:
        null

    };
  }


  // ==========================================================
  // PORTFOLIO VALUE
  // ==========================================================

  function calculatePortfolioValue() {

    const portfolio =
      getPortfolio();


    const stocks =
      getStocksFromMarketData()
        .map(
          normalizeStock
        );


    let invested =
      0;


    let currentValue =
      0;


    portfolio.positions.forEach(
      function (
        position
      ) {

        const live =
          stocks.find(
            function (
              stock
            ) {

              return (
                stock.symbol ===
                position.symbol
              );
            }
          );


        const price =
          live &&
          Number.isFinite(
            live.price
          )

            ? live.price

            : Number(
                position.lastPrice ||
                0
              );


        invested +=
          Number(
            position.invested ||
            0
          );


        currentValue +=
          price *
          Number(
            position.quantity ||
            0
          );

      }
    );


    const pnl =
      currentValue -
      invested;


    const pnlPercent =
      invested > 0
        ? pnl /
          invested *
          100
        : 0;


    return {

      invested,

      currentValue,

      pnl,

      pnlPercent

    };
  }


  // ==========================================================
  // PORTFOLIO RISK
  // ==========================================================

  function portfolioWarnings() {

    const portfolio =
      getPortfolio();


    const stocks =
      getStocksFromMarketData()
        .map(
          normalizeStock
        );


    const warnings =
      [];


    const values =
      portfolio.positions.map(
        function (
          position
        ) {

          const live =
            stocks.find(
              function (
                stock
              ) {

                return (
                  stock.symbol ===
                  position.symbol
                );
              }
            );


          const price =
            live
              ? live.price
              : Number(
                  position.lastPrice ||
                  0
                );


          return {

            ...position,

            value:
              price *
              Number(
                position.quantity ||
                0
              )

          };

        }
      );


    const total =
      values.reduce(
        function (
          sum,
          item
        ) {

          return (
            sum +
            item.value
          );

        },
        0
      );


    if (
      !total
    ) {

      return warnings;
    }


    values.forEach(
      function (
        item
      ) {

        const percent =
          item.value /
          total;


        if (
          percent >
          HARD_MAX_STOCK
        ) {

          warnings.push(
            `${item.symbol} portfolio allocation ${(
              percent * 100
            ).toFixed(
              2
            )}% hai — risk review required.`
          );
        }
      }
    );


    return warnings;
  }


  // ==========================================================
  // RECOMMENDATION HTML
  // ==========================================================

  function buildRecommendationHTML(
    budget,
    top20,
    result,
    monthly
  ) {

    const selected =
      result.selected.filter(
        function (
          stock
        ) {

          return (
            stock.quantity >
            0
          );
        }
      );


    let html =
      "";


    html += `
      <div
        style="
          padding:14px;
          margin-bottom:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >

        <div
          style="
            font-size:18px;
            font-weight:bold;
          "
        >
          🤖 Prototype-1 V5.3
        </div>

        <strong>
          Monthly Top-20 Smart Investment Plan
        </strong>

        <br><br>

        Budget:
        <strong>
          ₹${formatMoney(
            budget
          )}
        </strong>

        <br>

        Decision Mode:
        <strong>
          MONTHLY
        </strong>

        <br>

        Daily Monitoring:
        <strong>
          ACTIVE
        </strong>

        <br>

        Replacement Monitoring:
        <strong>
          ACTIVE
        </strong>

        <br>

        Monthly Top-20:
        <strong>
          ${
            monthly &&
            Array.isArray(
              monthly.symbols
            )
              ? monthly.symbols.length
              : top20.length
          }
        </strong>

        <br>

        Invested:
        <strong>
          ₹${formatMoney(
            result.totalInvestment
          )}
        </strong>

        <br>

        Balance:
        <strong>
          ₹${formatMoney(
            result.balance
          )}
        </strong>

        <br><br>

        <small>
          Investment decision monthly Top-20 par based hai.
          Daily ranking sirf monitoring aur early warning ke liye hai.
        </small>

      </div>
    `;


    html += `
      <div
        style="
          overflow-x:auto;
        "
      >

      <table
        style="
          width:100%;
          min-width:950px;
          border-collapse:collapse;
          font-size:13px;
        "
      >

      <thead>

        <tr>
    `;


    [
      "Rank",
      "Company",
      "Price",
      "Target %",
      "Target ₹",
      "Shares",
      "Actual ₹",
      "Actual %",
      "Sector",
      "Group"

    ].forEach(
      function (
        header
      ) {

        html += `
          <th
            style="
              text-align:left;
              padding:8px;
              border-bottom:
                1px solid #39424e;
              white-space:nowrap;
            "
          >
            ${header}
          </th>
        `;
      }
    );


    html += `
        </tr>

      </thead>

      <tbody>
    `;


    result.selected.forEach(
      function (
        stock
      ) {

        html += `
          <tr
            style="
              ${
                stock.quantity > 0
                  ? ""
                  : "opacity:0.65;"
              }
            "
          >

            <td
              style="padding:8px;"
            >
              ${stock.rank}
            </td>

            <td
              style="padding:8px;"
            >
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

            </td>

            <td
              style="padding:8px;"
            >
              ₹${formatMoney(
                stock.price
              )}
            </td>

            <td
              style="padding:8px;"
            >
              ${stock.targetPercent.toFixed(
                2
              )}%
            </td>

            <td
              style="padding:8px;"
            >
              ₹${formatMoney(
                stock.targetAmount
              )}
            </td>

            <td
              style="padding:8px;"
            >
              <strong>
                ${stock.quantity}
              </strong>
            </td>

            <td
              style="padding:8px;"
            >
              ₹${formatMoney(
                stock.investment
              )}
            </td>

            <td
              style="padding:8px;"
            >
              ${stock.actualPercent.toFixed(
                2
              )}%
            </td>

            <td
              style="padding:8px;"
            >
              ${escapeHtml(
                stock.sector
              )}
            </td>

            <td
              style="padding:8px;"
            >
              ${escapeHtml(
                stock.businessGroup
              )}
            </td>

          </tr>
        `;
      }
    );


    html += `
      </tbody>
      </table>
      </div>
    `;


    html += `
      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >

        <strong>
          📌 Selected Stocks
        </strong>

        <br>
    `;


    if (
      selected.length
    ) {

      selected.forEach(
        function (
          stock
        ) {

          html += `
            • ${escapeHtml(
              stock.symbol
            )}
            — ${stock.quantity}
            share(s)
            — ₹${formatMoney(
              stock.investment
            )}
            <br>
          `;
        }
      );


    } else {

      html +=
        "No stock could be allocated within current safety rules.<br>";
    }


    html += `
      </div>

      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.75;
        "
      >

        <strong>
          🧠 V5.3 Decision Logic
        </strong>

        <br>

        • Monthly Top-20 investment decision ka primary reference hai.
        <br>

        • Existing monthly Top-20 same month mein overwrite nahi hota.
        <br>

        • Daily monitoring continuously active hai.
        <br>

        • Ek din ki ranking change se automatic BUY/SELL nahi hoga.
        <br>

        • Monthly stock Top-20 se bahar jaane par pehle WATCH milega.
        <br>

        • Persistent deterioration confirm hone par EXIT REVIEW milega.
        <br>

        • Outside stock ko sirf #21 ya #22 hone se replacement nahi maana jayega.
        <br>

        • Replacement ke liye multiple actual monitoring dates ki confirmation required hai.
        <br>

        • Candidate ko current Top-20 presence aur improvement/stability dikhani hogi.
        <br>

        • Weak monthly stock aur strong candidate ka comparison kiya jayega.
        <br>

        • Replacement candidate automatic BUY/SELL trigger nahi hai.
        <br>

        • Final investment replacement monthly review par decide hoga.
        <br>

        • Analyze karne se portfolio mein fake purchase add nahi hoti.
        <br>

        • Whole-share allocation use hota hai.
        <br>

        • Normal individual-stock limit 20% hai.
        <br>

        • Small-budget first-share limit 25% hai.
        <br>

        • Hard stock limit 35% hai.
        <br>

        • Sector limit 40% hai.
        <br>

        • Business-group limit 30% hai.
        <br>

        • Budget kabhi exceed nahi hoga.
        <br>

        • Existing portfolio ki valuation live price se calculate hogi.
        <br>

        • Fake research score generate nahi kiya jayega.

      </div>

      <div
        style="
          margin-top:14px;
          padding:14px;
          border-top:
            1px solid #39424e;
          line-height:1.8;
        "
      >

        <strong>
          Final Summary
        </strong>

        <br>

        Budget:
        ₹${formatMoney(
          budget
        )}

        <br>

        Invested:
        ₹${formatMoney(
          result.totalInvestment
        )}

        <br>

        Balance:
        ₹${formatMoney(
          result.balance
        )}

        <br>

        Selected:
        ${selected.length}
        stocks

      </div>
    `;


    return html;
  }


  // ==========================================================
  // MONITORING UI
  // ==========================================================

  function appendMonitoringToRecommendation() {

    const box =
      document.getElementById(
        "recommendation"
      );


    if (!box) {
      return;
    }


    const monitoring =
      runMonitoring();


    if (
      !monitoring.success
    ) {

      return;
    }


    let html =
      "";


    // ========================================================
    // REPLACEMENT ALERTS
    // ========================================================

    html += `
      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.75;
        "
      >

        <strong>
          🔄 Replacement Review
        </strong>

        <br>

        Monthly Top-20 unchanged rahega.
        Sirf genuinely weak monthly stock ke liye
        sufficiently confirmed replacement candidate
        alert kiya jayega.

        <br><br>
    `;


    if (
      Array.isArray(
        monitoring.replacementAlerts
      ) &&
      monitoring.replacementAlerts.length
    ) {

      monitoring.replacementAlerts.forEach(
        function (
          alert
        ) {

          html += `
            <div
              style="
                margin-bottom:12px;
                padding:10px;
                border-radius:8px;
                border:1px solid #39424e;
              "
            >

              <strong>
                ⚠️ Current Stock:
              </strong>

              ${escapeHtml(
                alert.currentStock.name
              )}

              (${escapeHtml(
                alert.currentStock.symbol
              )})

              <br>

              Monthly Rank:
              #${alert.currentStock.monthlyRank}

              &nbsp;|&nbsp;

              Daily Rank:
              #${alert.currentStock.dailyRank}

              &nbsp;|&nbsp;

              Status:
              <strong>
                ${escapeHtml(
                  alert.currentStock.status
                )}
              </strong>

              <br>

              Weak Monitoring Days:
              <strong>
                ${alert.currentStock.weakDays}
              </strong>

              <br><br>

              <strong>
                🔄 Replacement Candidate:
              </strong>

              ${escapeHtml(
                alert.candidate.name
              )}

              (${escapeHtml(
                alert.candidate.symbol
              )})

              <br>

              Candidate Daily Rank:
              <strong>
                #${alert.candidate.currentRank}
              </strong>

              &nbsp;|&nbsp;

              Average Rank:
              <strong>
                #${alert.candidate.averageRank.toFixed(
                  1
                )}
              </strong>

              <br>

              Confirmed Top-20 Days:
              <strong>
                ${alert.candidate.confirmedTop20Days}
              </strong>

              &nbsp;|&nbsp;

              Improving Trend:
              <strong>
                ${
                  alert.candidate.improvingTrend
                    ? "YES"
                    : "NO"
                }
              </strong>

              <br>

              Rank Advantage:
              <strong>
                ${alert.rankAdvantage}
              </strong>

              <br><br>

              <strong>
                📌 REVIEW RECOMMENDED
              </strong>

              <br>

              <small>
                Automatic SELL/BUY nahi hoga.
                Monthly investment decision next official
                monthly review par change hoga.
              </small>

            </div>
          `;
        }
      );

    } else {

      html += `
        <div
          style="
            padding:8px 0;
          "
        >

          Abhi koi confirmed replacement alert nahi hai.

          <br>

          Outside Top-20 stocks daily monitor ho rahe hain,
          lekin sirf strong confirmation ke baad hi
          replacement candidate dikhaya jayega.

        </div>
      `;
    }


    html += `
      </div>
    `;


    // ========================================================
    // DAILY MONITORING
    // ========================================================

    const relevant =
      monitoring.monitored
        .filter(
          function (
            item
          ) {

            return (
              item.monthlyRank > 0 ||
              item.status ===
                "WATCH" ||
              item.status ===
                "EXIT REVIEW" ||
              item.status ===
                "IMPROVING"
            );
          }
        )
        .slice(
          0,
          30
        );


    html += `
      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.75;
        "
      >

        <strong>
          📊 Daily Monitoring
        </strong>

        <br>

        Investment decision monthly Top-20 par stable hai.
        Daily monitoring risk aur opportunity signals ko track karti hai.

        <br><br>
    `;


    relevant.forEach(
      function (
        item
      ) {

        html += `
          <div
            style="
              padding:7px 0;
              border-bottom:
                1px solid #252d38;
            "
          >

            <strong>
              ${escapeHtml(
                item.symbol
              )}
            </strong>

            —

            Monthly Rank:
            ${
              item.monthlyRank > 0
                ? "#" +
                  item.monthlyRank
                : "Outside Top-20"
            }

            —

            Daily Rank:
            #${item.dailyRank}

            —

            <strong>
              ${escapeHtml(
                item.status
              )}
            </strong>

            <br>

            <small>
              ${escapeHtml(
                item.reason
              )}
            </small>

          </div>
        `;
      }
    );


    const warnings =
      portfolioWarnings();


    if (
      warnings.length
    ) {

      html += `
        <div
          style="
            margin-top:12px;
            padding:10px;
            border-radius:8px;
            border:1px solid #39424e;
          "
        >

          <strong>
            ⚠️ Portfolio Risk Review
          </strong>

          <br>
      `;


      warnings.forEach(
        function (
          warning
        ) {

          html +=
            `• ${escapeHtml(
              warning
            )}<br>`;
        }
      );


      html +=
        "</div>";
    }


    html += `
      </div>
    `;


    // ========================================================
    // PORTFOLIO VALUE
    // ========================================================

    const valuation =
      calculatePortfolioValue();


    html += `
      <div
        style="
          margin-top:14px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >

        <strong>
          💰 Investment Tracking
        </strong>

        <br>

        Tracked Invested:
        <strong>
          ₹${formatMoney(
            valuation.invested
          )}
        </strong>

        <br>

        Current Value:
        <strong>
          ₹${formatMoney(
            valuation.currentValue
          )}
        </strong>

        <br>

        Current P/L:
        <strong>
          ${
            valuation.pnl >= 0
              ? "+"
              : ""
          }₹${formatMoney(
            valuation.pnl
          )}
          (
            ${valuation.pnlPercent.toFixed(
              2
            )}%
          )
        </strong>

        <br><br>

        <small>
          Analyze recommendation ko actual portfolio
          purchase nahi maana jata.
        </small>

      </div>
    `;


    box.innerHTML +=
      html;
  }


  // ==========================================================
  // PUBLIC FUNCTIONS
  // ==========================================================

  window.runPrototypeV5Monitoring =
    runMonitoring;


  window.getPrototypeV5Portfolio =
    function () {

      return {

        portfolio:
          getPortfolio(),

        valuation:
          calculatePortfolioValue(),

        riskWarnings:
          portfolioWarnings()

      };
    };


  window.getPrototypeV5Summary =
    function () {

      const result =
        runMonitoring();


      if (
        !result.success
      ) {

        return result;
      }


      return {

        month:
          result.month,

        monthlyTop20Count:
          result.monthlyTop20.length,

        watchCount:
          result.monitored.filter(
            x =>
              x.status ===
              "WATCH"
          ).length,

        exitReviewCount:
          result.monitored.filter(
            x =>
              x.status ===
              "EXIT REVIEW"
          ).length,

        improvingCount:
          result.monitored.filter(
            x =>
              x.status ===
              "IMPROVING"
          ).length,

        replacementAlertCount:
          Array.isArray(
            result.replacementAlerts
          )
            ? result.replacementAlerts.length
            : 0,

        holdCount:
          result.monitored.filter(
            x =>
              x.status ===
              "HOLD"
          ).length,

        portfolio:
          calculatePortfolioValue(),

        riskWarnings:
          portfolioWarnings(),

        replacementAlerts:
          result.replacementAlerts || []

      };
    };


  // ==========================================================
  // MARKET STATUS
  // ==========================================================

  function setMarketStatus(
    text,
    className
  ) {

    const status =
      document.getElementById(
        "marketStatus"
      );


    if (!status) {
      return;
    }


    status.textContent =
      text;


    status.className =
      className;
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  function showError(
    message
  ) {

    const box =
      document.getElementById(
        "errorBox"
      );


    if (!box) {
      return;
    }


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


    if (!box) {
      return;
    }


    box.textContent =
      "";


    box.style.display =
      "none";
  }


  // ==========================================================
  // FORMAT
  // ==========================================================

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


  // ==========================================================
  // ESCAPE HTML
  // ==========================================================

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


  // ==========================================================
  // PERIODIC MONITORING
  // ==========================================================

  setInterval(
    function () {

      try {

        if (
          window.MARKET_DATA &&
          window.MARKET_DATA.success
        ) {

          runMonitoring();

          renderTop20();
        }


      } catch (error) {

        console.error(
          "Periodic monitoring error:",
          error
        );
      }

    },
    5 * 60 * 1000
  );


  // ==========================================================
  // READY
  // ==========================================================

  console.log(
    "Prototype-1 app.js V5.3 loaded successfully."
  );

})();
