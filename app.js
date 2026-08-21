// ============================================================
// PROTOTYPE-1 — APP ENGINE V5.3
// ============================================================
// MONTHLY TOP-20
// DAILY MONITORING
// PERSISTENT DETERIORATION
// REPLACEMENT CANDIDATE DETECTION
// SMART WHOLE-SHARE ALLOCATION
// INVESTMENT + PORTFOLIO TRACKING
//
// IMPORTANT DESIGN:
//
// 1. Monthly Top-20 is the investment baseline.
// 2. Daily ranking NEVER overwrites Monthly Top-20.
// 3. Daily ranking is used only for monitoring.
// 4. One bad day does NOT trigger EXIT REVIEW.
// 5. Persistent weakness can trigger EXIT REVIEW.
// 6. A stock outside Monthly Top-20 can become a
//    REPLACEMENT CANDIDATE only after sufficient confirmation.
// 7. Replacement is NEVER automatic.
// 8. Analyze NEVER creates a fake purchase.
// 9. Portfolio tracking is based only on actual recorded positions.
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
  const MAX_SEARCH_ITERATIONS = 20000;

  // Daily history retained.
  const DAILY_HISTORY_LIMIT = 31;

  // EXIT REVIEW:
  // stock must show serious weakness on multiple
  // recent monitoring observations.
  const EXIT_REVIEW_MIN_DAYS = 2;

  // Daily rank threshold considered materially weak.
  const WEAK_DAILY_RANK = 30;

  // Candidate should normally be in this zone
  // before being considered a strong replacement.
  const REPLACEMENT_CANDIDATE_RANK = 20;

  // Candidate must beat the existing monthly member
  // by this many daily-rank positions.
  const REPLACEMENT_RANK_ADVANTAGE = 5;

  // Candidate must demonstrate strength on at least
  // this many recent monitoring observations.
  const REPLACEMENT_MIN_STRONG_DAYS = 2;

  // Candidate must be seen in recent history.
  const REPLACEMENT_LOOKBACK_DAYS = 3;

  const PORTFOLIO_KEY =
    "prototype1_portfolio_v5";

  const MONTHLY_KEY =
    "prototype1_monthly_top20_v5";

  const DAILY_KEY =
    "prototype1_daily_monitoring_v5";

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

            // IMPORTANT:
            // Monitoring updates daily state but does
            // NOT overwrite current month's Top-20.
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
      // ANALYZE
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

            // Ensure monitoring state exists.
            // Existing Monthly Top-20 remains locked.
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

              // Analyze is only a recommendation.
              // It does NOT create a purchase.
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
  // MAIN ANALYSIS
  // ==========================================================

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

      const stocks =
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

      const ranked =
        smartRankStocks(stocks);

      // --------------------------------------------------------
      // MONTHLY BASELINE
      // --------------------------------------------------------

      let monthly =
        getSavedMonthly();

      if (!monthly) {

        monthly =
          createMonthlyTop20(
            ranked
          );
      }

      const monthlySymbols =
        Array.isArray(
          monthly.symbols
        )
          ? monthly.symbols
          : [];

      const monthlyStocks =
        monthlySymbols
          .map(
            symbol =>
              ranked.find(
                s =>
                  s.symbol ===
                  symbol
              )
          )
          .filter(Boolean);

      let top20 =
        monthlyStocks.slice(
          0,
          TARGET_TOP20
        );

      // --------------------------------------------------------
      // Corruption / empty memory safety fallback.
      // This is NOT a daily replacement.
      // --------------------------------------------------------

      if (!top20.length) {

        monthly =
          createMonthlyTop20(
            ranked
          );

        top20 =
          monthly.symbols
            .map(
              symbol =>
                ranked.find(
                  s =>
                    s.symbol ===
                    symbol
                )
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
            s =>
              s.quantity > 0
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
  // RANKING
  // ==========================================================

  function smartRankStocks(stocks) {

    return stocks
      .map(function (stock) {

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

      })
      .sort(
        (a, b) =>
          b.engineScore -
          a.engineScore
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
    ).map(function (key) {

      const item =
        market.stocks[key] || {};

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
    });
  }


  // ==========================================================
  // NORMALIZE
  // ==========================================================

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
        list[i] || {};

      const itemSymbol =
        String(
          item.symbol || ""
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


  // ==========================================================
  // MONTH KEY
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
  // MONTHLY MEMORY
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

    } catch (e) {

      console.warn(
        "Monthly memory read failed:",
        e
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
          s =>
            s.symbol
        );

    const monthly = {

      month:
        currentMonthKey(),

      symbols,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      baselineReason:
        "Monthly review baseline"
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

    } catch (e) {

      console.warn(
        "Monthly data save failed:",
        e
      );
    }
  }


  // ==========================================================
  // DAILY HISTORY
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

    } catch (e) {

      console.warn(
        "Daily history read failed:",
        e
      );
    }

    return [];
  }


  function saveDailyHistory(
    history
  ) {

    try {

      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({

          updatedAt:
            new Date().toISOString(),

          history
        })
      );

    } catch (e) {

      console.warn(
        "Daily history save failed:",
        e
      );
    }
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
  // DAILY SNAPSHOT
  // ==========================================================

  function createDailySnapshot(
    stocks
  ) {

    return stocks.map(
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
            stock.price,

          engineScore:
            stock.engineScore
        };
      }
    );
  }


  // ==========================================================
  // UPDATE DAILY HISTORY
  // ==========================================================

  function updateDailyHistory(
    stocks
  ) {

    const today =
      localDateKey();

    const snapshot =
      createDailySnapshot(
        stocks
      );

    const history =
      getDailyHistory();

    const todayIndex =
      history.findIndex(
        item =>
          item.date ===
          today
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

        data:
          snapshot,

        updatedAt:
          new Date().toISOString()
      });
    }

    const trimmed =
      history.slice(
        -DAILY_HISTORY_LIMIT
      );

    saveDailyHistory(
      trimmed
    );

    return trimmed;
  }


  // ==========================================================
  // HISTORY STOCK LOOKUP
  // ==========================================================

  function getHistoryStock(
    day,
    symbol
  ) {

    if (
      !day ||
      !Array.isArray(
        day.data
      )
    ) {
      return null;
    }

    return (
      day.data.find(
        item =>
          item.symbol ===
          symbol
      ) ||
      null
    );
  }


  // ==========================================================
  // PERSISTENT DETERIORATION
  // ==========================================================

  function getDeteriorationStatus(
    symbol,
    history
  ) {

    const recent =
      history.slice(
        -3
      );

    let badDays = 0;

    let weakDays = 0;

    let worstRank = 0;

    recent.forEach(
      function (day) {

        const item =
          getHistoryStock(
            day,
            symbol
          );

        if (!item) {
          return;
        }

        const rank =
          Number(
            item.dailyRank
          );

        if (
          rank >=
          WEAK_DAILY_RANK
        ) {

          badDays++;

          worstRank =
            Math.max(
              worstRank,
              rank
            );

        }

        if (
          rank > TARGET_TOP20
        ) {

          weakDays++;
        }
      }
    );

    return {

      badDays,

      weakDays,

      worstRank,

      exitReview:
        badDays >=
        EXIT_REVIEW_MIN_DAYS
    };
  }


  // ==========================================================
  // CANDIDATE HISTORY STRENGTH
  // ==========================================================

  function getCandidateStrength(
    symbol,
    history
  ) {

    const recent =
      history.slice(
        -REPLACEMENT_LOOKBACK_DAYS
      );

    let strongDays = 0;

    let top20Days = 0;

    let bestRank = 999;

    let averageRank = 999;

    let rankValues = [];

    recent.forEach(
      function (day) {

        const item =
          getHistoryStock(
            day,
            symbol
          );

        if (!item) {
          return;
        }

        const rank =
          Number(
            item.dailyRank
          );

        if (
          !Number.isFinite(rank)
        ) {
          return;
        }

        rankValues.push(
          rank
        );

        bestRank =
          Math.min(
            bestRank,
            rank
          );

        if (
          rank <=
          REPLACEMENT_CANDIDATE_RANK
        ) {

          strongDays++;
        }

        if (
          rank <=
          TARGET_TOP20
        ) {

          top20Days++;
        }
      }
    );

    if (
      rankValues.length
    ) {

      averageRank =
        rankValues.reduce(
          (
            sum,
            value
          ) =>
            sum + value,
          0
        ) /
        rankValues.length;
    }

    return {

      observations:
        rankValues.length,

      strongDays,

      top20Days,

      bestRank,

      averageRank
    };
  }


  // ==========================================================
  // REPLACEMENT CANDIDATE DETECTION
  // ==========================================================

  function findReplacementCandidates(
    stocks,
    monthly,
    history
  ) {

    if (
      !monthly ||
      !Array.isArray(
        monthly.symbols
      )
    ) {
      return [];
    }

    const monthlySet =
      new Set(
        monthly.symbols
      );

    const candidates = [];

    stocks.forEach(
      function (
        stock,
        index
      ) {

        // Candidate must currently be outside
        // monthly Top-20.
        if (
          monthlySet.has(
            stock.symbol
          )
        ) {
          return;
        }

        const dailyRank =
          index + 1;

        // We don't call a #21/#22 stock an
        // immediate replacement.
        if (
          dailyRank >
          REPLACEMENT_CANDIDATE_RANK
        ) {
          return;
        }

        const strength =
          getCandidateStrength(
            stock.symbol,
            history
          );

        // Require actual historical observations.
        if (
          strength.observations <
          REPLACEMENT_MIN_STRONG_DAYS
        ) {
          return;
        }

        // Candidate should have appeared strong
        // on at least the configured number of days.
        if (
          strength.strongDays <
          REPLACEMENT_MIN_STRONG_DAYS
        ) {
          return;
        }

        candidates.push({

          ...stock,

          dailyRank,

          strongDays:
            strength.strongDays,

          top20Days:
            strength.top20Days,

          bestRank:
            strength.bestRank,

          averageRank:
            strength.averageRank,

          candidateStatus:
            "REPLACEMENT CANDIDATE"
        });
      }
    );


    // Strongest candidate first.
    candidates.sort(
      function (
        a,
        b
      ) {

        if (
          a.dailyRank !==
          b.dailyRank
        ) {

          return (
            a.dailyRank -
            b.dailyRank
          );
        }

        if (
          a.strongDays !==
          b.strongDays
        ) {

          return (
            b.strongDays -
            a.strongDays
          );
        }

        return (
          a.averageRank -
          b.averageRank
        );
      }
    );

    return candidates;
  }


  // ==========================================================
  // MATCH CANDIDATE AGAINST WEAK MONTHLY STOCK
  // ==========================================================

  function buildReplacementAlerts(
    stocks,
    monthly,
    history
  ) {

    if (
      !monthly ||
      !Array.isArray(
        monthly.symbols
      )
    ) {
      return [];
    }

    const candidates =
      findReplacementCandidates(
        stocks,
        monthly,
        history
      );

    if (!candidates.length) {
      return [];
    }

    const alerts = [];

    monthly.symbols.forEach(
      function (
        monthlySymbol
      ) {

        const current =
          stocks.find(
            s =>
              s.symbol ===
              monthlySymbol
          );

        if (!current) {
          return;
        }

        const deterioration =
          getDeteriorationStatus(
            monthlySymbol,
            history
          );

        const currentRank =
          stocks.findIndex(
            s =>
              s.symbol ===
              monthlySymbol
          ) + 1;

        // We only suggest a replacement if
        // the monthly member has demonstrated
        // meaningful weakness.
        if (
          !deterioration.exitReview &&
          currentRank <= TARGET_TOP20
        ) {
          return;
        }

        const suitable =
          candidates.find(
            candidate => {

              const advantage =
                currentRank -
                candidate.dailyRank;

              return (
                advantage >=
                REPLACEMENT_RANK_ADVANTAGE
              );
            }
          );

        if (!suitable) {
          return;
        }

        alerts.push({

          outgoingSymbol:
            monthlySymbol,

          outgoingName:
            current.name,

          outgoingDailyRank:
            currentRank,

          outgoingChange:
            current.change,

          outgoingBadDays:
            deterioration.badDays,

          outgoingStatus:
            deterioration.exitReview
              ? "EXIT REVIEW"
              : "WATCH",

          candidateSymbol:
            suitable.symbol,

          candidateName:
            suitable.name,

          candidateDailyRank:
            suitable.dailyRank,

          candidateChange:
            suitable.change,

          candidateStrongDays:
            suitable.strongDays,

          candidateBestRank:
            suitable.bestRank,

          candidateAverageRank:
            suitable.averageRank,

          reason:
            deterioration.exitReview
              ? "Monthly Top-20 member shows persistent weakness and a stronger outside candidate has been confirmed."
              : "Monthly Top-20 member is weakening and a materially stronger outside candidate has been confirmed."
        });
      }
    );

    return alerts;
  }


  // ==========================================================
  // MAIN MONITORING
  // ==========================================================

  function runMonitoring() {

    const stocks =
      smartRankStocks(
        getStocksFromMarketData()
          .map(normalizeStock)
          .filter(isValidStock)
      );

    if (!stocks.length) {

      return {

        success: false,

        monitored: [],

        replacementAlerts: []
      };
    }


    const currentTop20 =
      stocks
        .slice(
          0,
          TARGET_TOP20
        )
        .map(
          s =>
            s.symbol
        );


    // --------------------------------------------------------
    // Monthly memory
    // --------------------------------------------------------

    let monthly =
      getSavedMonthly();

    if (!monthly) {

      monthly =
        createMonthlyTop20(
          stocks
        );
    }


    // --------------------------------------------------------
    // Daily history
    // --------------------------------------------------------

    const history =
      updateDailyHistory(
        stocks
      );


    // --------------------------------------------------------
    // Monitoring status
    // --------------------------------------------------------

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
          // Monthly Top-20 member
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


            // ------------------------------------------------
            // Improvement
            // ------------------------------------------------

            if (
              dailyRank <= 15 &&
              dailyRank <
                monthlyRank
            ) {

              status =
                "IMPROVING";

              reason =
                "Daily position monthly position ke comparison mein improve hui hai.";
            }


            // ------------------------------------------------
            // Persistent deterioration
            // ------------------------------------------------

            const deterioration =
              getDeteriorationStatus(
                stock.symbol,
                history
              );

            if (
              deterioration.exitReview
            ) {

              status =
                "EXIT REVIEW";

              reason =
                `Persistent deterioration detected: ${deterioration.badDays} recent monitoring day(s) materially weak. Detailed review required.`;

            } else if (
              deterioration.weakDays > 0 &&
              dailyRank > TARGET_TOP20
            ) {

              status =
                "WATCH";

              reason =
                "Weakness observe hui hai, lekin EXIT REVIEW ke liye confirmation abhi sufficient nahi hai.";
            }
          }


          // --------------------------------------------------
          // Outside Monthly Top-20
          // --------------------------------------------------

          else {

            if (
              dailyRank <=
              REPLACEMENT_CANDIDATE_RANK
            ) {

              const strength =
                getCandidateStrength(
                  stock.symbol,
                  history
                );

              if (
                strength.strongDays >=
                REPLACEMENT_MIN_STRONG_DAYS
              ) {

                status =
                  "REPLACEMENT CANDIDATE";

                reason =
                  "Stock daily ranking mein consistently strong hai aur next monthly review ke liye replacement candidate ke roop mein monitor ho raha hai.";

              } else {

                status =
                  "IMPROVING";

                reason =
                  "Stock current daily ranking mein improve kar raha hai; replacement confirmation ke liye aur monitoring required hai.";
              }

            } else {

              status =
                "MONITOR";

              reason =
                "Monthly Top-20 ke bahar hai; monitoring continue rakhein.";
            }
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


    // --------------------------------------------------------
    // Replacement alerts
    // --------------------------------------------------------

    const replacementAlerts =
      buildReplacementAlerts(
        stocks,
        monthly,
        history
      );


    // --------------------------------------------------------
    // Save compatibility state
    // --------------------------------------------------------

    saveDailyMonitoring(
      history,
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
        currentTop20,

      monitored,

      history,

      replacementAlerts
    };
  }


  // ==========================================================
  // DAILY MONITORING SAVE
  // ==========================================================

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

          updatedAt:
            new Date().toISOString(),

          history,

          data:
            monitored,

          replacementAlerts:
            replacementAlerts || []
        })
      );

    } catch (e) {

      console.warn(
        "Daily monitoring save failed:",
        e
      );
    }
  }


  // ==========================================================
  // SMART WHOLE-SHARE PLAN
  // ==========================================================

  function buildSmartPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;

    if (!count) {

      return {

        selected: [],

        totalInvestment: 0,

        balance:
          budget
      };
    }


    const weightTotal =
      stocks.reduce(
        (
          sum,
          stock,
          index
        ) =>
          sum +
          (
            count -
            index
          ),
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
              budget * target,

            quantity: 0,

            investment: 0,

            actualPercent: 0,

            sectorPercent: 0,

            groupPercent: 0
          };
        }
      );


    let total = 0;


    // --------------------------------------------------------
    // First diversification
    // --------------------------------------------------------

    const candidates =
      selected
        .filter(
          s =>
            s.price <=
            budget
        )
        .sort(
          (a, b) => {

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

            return br - ar;
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
          budget - total
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
    // Whole-share allocation
    // --------------------------------------------------------

    let guard = 0;

    while (
      guard++ <
      MAX_SEARCH_ITERATIONS
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
            stock =>
              canAdd(
                stock,
                selected,
                budget,
                balance
              )
          )
          .map(
            stock => ({

              stock,

              score:
                allocationScore(
                  stock,
                  selected,
                  budget,
                  balance
                )
            })
          )
          .sort(
            (a, b) =>
              b.score -
              a.score
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
          budget - total
        )
    };
  }


  // ==========================================================
  // CAN ADD SHARE
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
        gap / target
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
            stock.change || 0
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

    const totals = {};

    stocks.forEach(
      stock => {

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

    const totals = {};

    stocks.forEach(
      stock => {

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
      stock => {

        stock.actualPercent =
          total > 0
            ? stock.investment /
              total *
              100
            : 0;

        stock.sectorPercent =
          total > 0
            ? (
                sectors[
                  stock.sector
                ] || 0
              ) /
              total *
              100
            : 0;

        stock.groupPercent =
          total > 0
            ? (
                groups[
                  stock.businessGroup
                ] || 0
              ) /
              total *
              100
            : 0;
      }
    );
  }


  function countSelected(
    stocks
  ) {

    return stocks.filter(
      s =>
        s.quantity > 0
    ).length;
  }


  // ==========================================================
  // CURRENT DAILY TOP-20 DISPLAY
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
          .map(normalizeStock)
          .filter(isValidStock)
      ).slice(
        0,
        TARGET_TOP20
      );


    if (!stocks.length) {

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
        s =>
          s.quantity > 0
      );


    let html = "";


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
          Monthly Top-20 investment decision daily ranking
          se automatically change nahi hota.
          Daily monitoring possible deterioration aur
          replacement candidates ko identify karti hai.
        </small>

      </div>
    `;


    // --------------------------------------------------------
    // Allocation table
    // --------------------------------------------------------

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
      function (header) {

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
      function (stock) {

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

            <td style="padding:8px;">
              ${stock.rank}
            </td>

            <td style="padding:8px;">
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

            <td style="padding:8px;">
              ₹${formatMoney(
                stock.price
              )}
            </td>

            <td style="padding:8px;">
              ${stock.targetPercent.toFixed(2)}%
            </td>

            <td style="padding:8px;">
              ₹${formatMoney(
                stock.targetAmount
              )}
            </td>

            <td style="padding:8px;">
              <strong>
                ${stock.quantity}
              </strong>
            </td>

            <td style="padding:8px;">
              ₹${formatMoney(
                stock.investment
              )}
            </td>

            <td style="padding:8px;">
              ${stock.actualPercent.toFixed(2)}%
            </td>

            <td style="padding:8px;">
              ${escapeHtml(
                stock.sector
              )}
            </td>

            <td style="padding:8px;">
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


    // --------------------------------------------------------
    // Selected stocks
    // --------------------------------------------------------

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
        function (stock) {

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
    `;


    // --------------------------------------------------------
    // Decision logic
    // --------------------------------------------------------

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
          🧠 V5.3 Decision Logic
        </strong>

        <br>

        • Monthly Top-20 investment decision ka primary reference hai.
        <br>

        • Existing monthly Top-20 same month mein overwrite nahi hota.
        <br>

        • Daily rank sirf monitoring signal hai.
        <br>

        • Daily fluctuation se automatic BUY/SELL nahi hoga.
        <br>

        • Top-20 se bahar jaane par pehle WATCH signal milega.
        <br>

        • Persistent deterioration hone par EXIT REVIEW milega.
        <br>

        • Bahar ka stock sirf #21/#22 aane se replacement nahi banega.
        <br>

        • Strong candidate ko multiple monitoring observations ke baad REPLACEMENT CANDIDATE banaya jayega.
        <br>

        • Replacement automatic nahi hoga.
        <br>

        • Replacement candidate next monthly review ke liye track hoga.
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
    `;


    // --------------------------------------------------------
    // Final summary
    // --------------------------------------------------------

    html += `
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


    // --------------------------------------------------------
    // Replacement alerts
    // --------------------------------------------------------

    let html = "";


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
          🔄 Replacement Candidate Monitoring
        </strong>

        <br>

        Monthly Top-20 unchanged rahega,
        lekin month ke beech weak stock ke potential
        replacement candidates daily monitor kiye ja rahe hain.

        <br><br>
    `;


    if (
      monitoring.replacementAlerts &&
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
                ⚠️ REVIEW:
                ${escapeHtml(
                  alert.outgoingSymbol
                )}
              </strong>

              <br>

              Current Daily Rank:
              #${alert.outgoingDailyRank}

              <br>

              Status:
              <strong>
                ${escapeHtml(
                  alert.outgoingStatus
                )}
              </strong>

              <br><br>

              Possible Replacement:
              <strong>
                ${escapeHtml(
                  alert.candidateSymbol
                )}
              </strong>

              — Daily Rank:
              #${alert.candidateDailyRank}

              <br>

              Candidate Strong Days:
              ${alert.candidateStrongDays}

              <br>

              Candidate Best Rank:
              #${alert.candidateBestRank}

              <br><br>

              <small>
                ${escapeHtml(
                  alert.reason
                )}
              </small>

              <br><br>

              <strong>
                Action:
              </strong>

              Automatic replacement nahi hoga.
              Is signal ko review karke next monthly decision
              mein consider kiya jayega.

            </div>
          `;
        }
      );

    } else {

      html += `
        <div
          style="
            padding:10px;
            border-radius:8px;
            border:1px solid #39424e;
          "
        >
          Abhi koi sufficiently strong replacement
          candidate confirmed nahi hai.
          Daily monitoring continue hai.
        </div>
      `;
    }


    html += `
      </div>
    `;


    // --------------------------------------------------------
    // Daily monitoring
    // --------------------------------------------------------

    const relevant =
      monitoring.monitored
        .filter(
          item =>
            item.monthlyRank > 0 ||
            item.status ===
              "IMPROVING" ||
            item.status ===
              "REPLACEMENT CANDIDATE"
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
          📊 Monthly Top-20 Daily Monitoring
        </strong>

        <br>

        Monthly investment decision stable rahega;
        daily ranking monitoring aur early-warning signal hai.

        <br><br>
    `;


    relevant.forEach(
      function (item) {

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
                : "Candidate"
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


    // --------------------------------------------------------
    // Portfolio risk
    // --------------------------------------------------------

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
        warning => {

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


    // --------------------------------------------------------
    // Portfolio valuation
    // --------------------------------------------------------

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
            ${valuation.pnlPercent.toFixed(2)}%
          )
        </strong>

        <br><br>

        <small>
          New recommendations portfolio mein automatically
          add nahi hoti. Actual purchase record hone ke baad
          hi portfolio tracking update honi chahiye.
        </small>

      </div>
    `;


    box.innerHTML +=
      html;
  }


  // ==========================================================
  // INVESTMENT TRACKING
  // ==========================================================

  /*
   * IMPORTANT:
   *
   * Analyze = recommendation only.
   * No fake purchase.
   *
   * Actual BUY transaction integration future step mein
   * alag function se ki jayegi.
   */

  function saveInvestmentPlan(
    result
  ) {

    if (
      !result ||
      !Array.isArray(
        result.selectedStocks
      )
    ) {

      return false;
    }


    console.warn(
      "saveInvestmentPlan disabled for Analyze-only flow."
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

    } catch (e) {

      console.warn(
        "Portfolio read failed:",
        e
      );
    }


    return {

      positions: [],

      totalInvested: 0,

      updatedAt: null
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

    let invested = 0;

    let currentValue = 0;


    portfolio.positions.forEach(
      function (
        position
      ) {

        const live =
          stocks.find(
            s =>
              s.symbol ===
              position.symbol
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

    const positions =
      portfolio.positions;

    const warnings = [];


    const values =
      positions.map(
        function (p) {

          const live =
            stocks.find(
              s =>
                s.symbol ===
                p.symbol
            );

          const price =
            live
              ? live.price
              : Number(
                  p.lastPrice ||
                  0
                );


          return {

            ...p,

            value:
              price *
              Number(
                p.quantity ||
                0
              )
          };
        }
      );


    const total =
      values.reduce(
        (
          sum,
          p
        ) =>
          sum +
          p.value,
        0
      );


    if (!total) {
      return warnings;
    }


    values.forEach(
      function (p) {

        const percent =
          p.value /
          total;


        if (
          percent >
          HARD_MAX_STOCK
        ) {

          warnings.push(
            `${p.symbol} portfolio allocation ${(
              percent * 100
            ).toFixed(2)}% hai — risk review required.`
          );
        }
      }
    );


    return warnings;
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

        replacementCandidateCount:
          result.monitored.filter(
            x =>
              x.status ===
              "REPLACEMENT CANDIDATE"
          ).length,

        improvingCount:
          result.monitored.filter(
            x =>
              x.status ===
              "IMPROVING"
          ).length,

        holdCount:
          result.monitored.filter(
            x =>
              x.status ===
              "HOLD"
          ).length,

        replacementAlerts:
          result.replacementAlerts || [],

        portfolio:
          calculatePortfolioValue(),

        riskWarnings:
          portfolioWarnings()
      };
    };


  // ==========================================================
  // STATUS
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

  /*
   * Every 5 minutes:
   *
   * - read current market data
   * - update daily monitoring
   * - update current daily Top-20 display
   *
   * IMPORTANT:
   * Monthly Top-20 remains locked.
   */

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
