/* ============================================================
   PROTOTYPE-1 — APP ENGINE V13 FIXED
   ------------------------------------------------------------
   FIXES:
   1. /api/quotes se live market data properly load
   2. window.fetchMarketData() restored
   3. Kotak TOTP ko galat API contract mein nahi bhejna
   4. /api/quotes response.stocks -> MARKET_DATA
   5. perChange ko percentage change ke roop mein use
   6. Monthly Top-20 daily ranking se overwrite nahi
   7. Daily rank always 1...50
   8. EXIT REVIEW fresh allocation se excluded
   9. Whole-share allocation
   10. Final allocation validation
   11. Existing UI IDs preserved
   12. Existing api/quotes.js flow untouched
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     CONFIG
     ============================================================ */

  const TARGET_TOP20 = 20;
  const MIN_DIVERSIFIED_STOCKS = 5;

  const NORMAL_MAX_STOCK = 0.20;
  const SMALL_BUDGET_THRESHOLD = 20000;
  const SMALL_BUDGET_MAX_STOCK = 0.25;
  const HARD_MAX_STOCK = 0.35;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const REPLACEMENT_POOL_SIZE = 5;

  const PORTFOLIO_KEY =
    "prototype1_portfolio_v13";

  const MONTHLY_KEY =
    "prototype1_monthly_top20_v13";

  const DAILY_KEY =
    "prototype1_daily_monitoring_v13";

  const OLD_MONTHLY_KEYS = [
    "prototype1_monthly_top20_v12",
    "prototype1_monthly_top20_v11",
    "prototype1_monthly_top20_v10",
    "prototype1_monthly_top20_v7",
    "prototype1_monthly_top20_v6",
    "prototype1_monthly_top20_v5"
  ];

  const OLD_DAILY_KEYS = [
    "prototype1_daily_monitoring_v12",
    "prototype1_daily_monitoring_v11",
    "prototype1_daily_monitoring_v10",
    "prototype1_daily_monitoring_v7",
    "prototype1_daily_monitoring_v6",
    "prototype1_daily_monitoring_v5"
  ];

  /* ============================================================
     DOM
     ============================================================ */

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

  const top20List =
    document.getElementById("top20List");

  /* ============================================================
     HELPERS
     ============================================================ */

  function safeNumber(value, fallback = 0) {
    const n = Number(value);

    return Number.isFinite(n)
      ? n
      : fallback;
  }

  function money(value) {
    return (
      "₹" +
      safeNumber(value).toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );
  }

  function percent(value) {
    return (
      safeNumber(value).toFixed(2) +
      "%"
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function currentMonthKey() {
    const d = new Date();

    return (
      d.getFullYear() +
      "-" +
      String(
        d.getMonth() + 1
      ).padStart(2, "0")
    );
  }

  function todayKey() {
    const d = new Date();

    return (
      d.getFullYear() +
      "-" +
      String(
        d.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        d.getDate()
      ).padStart(2, "0")
    );
  }

  function normalizeSymbol(symbol) {
    return String(symbol || "")
      .toUpperCase()
      .replace(/-EQ$/i, "")
      .trim();
  }

  function storageRead(
    key,
    fallback = null
  ) {
    try {
      const raw =
        localStorage.getItem(key);

      if (!raw) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function storageWrite(
    key,
    value
  ) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.warn(
        "Storage write failed:",
        error
      );

      return false;
    }
  }

  /* ============================================================
     KOTAK NEO LIVE DATA BRIDGE
     ------------------------------------------------------------
     IMPORTANT:
     api/quotes.js untouched.
     It returns:
       {
         success,
         totalRequested,
         totalReceived,
         stocks: [...]
       }
     ============================================================ */

  async function fetchMarketData() {
    const response =
      await fetch(
        "/api/quotes?ts=" +
        Date.now(),
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept:
              "application/json"
          }
        }
      );

    const text =
      await response.text();

    let data = null;

    try {
      data = text
        ? JSON.parse(text)
        : null;
    } catch {
      throw new Error(
        "Market API ne valid JSON response nahi diya."
      );
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error ||
        `Market API failed (${response.status})`;

      throw new Error(
        typeof message === "string"
          ? message
          : "Kotak market API failed."
      );
    }

    if (
      !data ||
      !Array.isArray(data.stocks)
    ) {
      throw new Error(
        "Market API response mein stocks array nahi mila."
      );
    }

    /*
      Convert Kotak API response into the
      exact format expected by the engine.
    */
    const normalized =
      data.stocks
        .map(item => {
          const ltp =
            safeNumber(
              item.ltp
            );

          const perChange =
            safeNumber(
              item.perChange
            );

          const absoluteChange =
            safeNumber(
              item.change
            );

          return {
            ...item,

            symbol:
              normalizeSymbol(
                item.symbol ||
                item.displaySymbol
              ),

            name:
              item.name ||
              item.companyName ||
              item.displaySymbol ||
              item.symbol,

            price:
              ltp,

            /*
              VERY IMPORTANT:
              Ranking percentage change
              should use perChange.
            */
            change:
              perChange,

            changePercent:
              perChange,

            pChange:
              perChange,

            absoluteChange,

            ltp,

            lastPrice:
              ltp
          };
        })
        .filter(
          item =>
            item.symbol &&
            item.price > 0 &&
            Number.isFinite(
              item.change
            )
        );

    if (
      normalized.length <
      TARGET_TOP20
    ) {
      throw new Error(
        `Live market data incomplete hai: ${normalized.length}/50 valid stocks received.`
      );
    }

    window.MARKET_DATA =
      normalized;

    return normalized;
  }

  /*
    Expose globally because the rest of the
    application uses window.fetchMarketData().
  */
  window.fetchMarketData =
    fetchMarketData;

  /* ============================================================
     MASTER STOCK LOOKUP
     ============================================================ */

  function findNiftyStock(symbol) {
    const target =
      normalizeSymbol(symbol);

    const master =
      Array.isArray(
        window.NIFTY_50_STOCKS
      )
        ? window.NIFTY_50_STOCKS
        : [];

    return (
      master.find(item => {
        const candidate =
          normalizeSymbol(
            item?.symbol ||
            item?.tradingsymbol ||
            item?.ticker
          );

        return candidate === target;
      }) || null
    );
  }

  function inferBusinessGroup(
    symbol
  ) {
    const s =
      normalizeSymbol(symbol);

    const groups = {
      HDFCBANK:
        "HDFC Group",

      HDFCLIFE:
        "HDFC Group",

      ICICIBANK:
        "ICICI Group",

      ICICIPRULI:
        "ICICI Group",

      "BAJAJ-AUTO":
        "Bajaj Group",

      BAJFINANCE:
        "Bajaj Group",

      BAJAJFINSV:
        "Bajaj Group",

      RELIANCE:
        "Reliance Group",

      TATAMOTORS:
        "Tata Group",

      TATASTEEL:
        "Tata Group",

      TATACONSUM:
        "Tata Group",

      TCS:
        "Tata Group",

      TITAN:
        "Tata Group",

      TRENT:
        "Tata Group",

      SBIN:
        "SBI Group",

      SBILIFE:
        "SBI Group",

      ADANIENT:
        "Adani Group",

      ADANIPORTS:
        "Adani Group",

      LT:
        "Larsen Group",

      LTIM:
        "Larsen Group",

      LTTS:
        "Larsen Group"
    };

    return (
      groups[s] ||
      s
    );
  }

  /* ============================================================
     STOCK NORMALIZATION
     ============================================================ */

  function normalizeStock(stock) {
    const symbol =
      normalizeSymbol(
        stock?.symbol ||
        stock?.tradingsymbol ||
        stock?.ticker
      );

    const master =
      findNiftyStock(symbol);

    const price =
      safeNumber(
        stock?.price ??
        stock?.ltp ??
        stock?.lastPrice
      );

    /*
      Prefer percentage change.
    */
    const change =
      safeNumber(
        stock?.perChange ??
        stock?.changePercent ??
        stock?.pChange ??
        stock?.change
      );

    return {
      ...stock,

      symbol,

      name:
        stock?.name ||
        stock?.companyName ||
        master?.name ||
        symbol,

      sector:
        stock?.sector ||
        master?.sector ||
        "Other",

      businessGroup:
        stock?.businessGroup ||
        stock?.group ||
        master?.businessGroup ||
        inferBusinessGroup(
          symbol
        ),

      price,

      change,

      changePercent:
        change,

      chartScore:
        safeNumber(
          stock?.chartScore
        ),

      fundamentalScore:
        safeNumber(
          stock?.fundamentalScore
        ),

      newsScore:
        safeNumber(
          stock?.newsScore
        ),

      priority:
        safeNumber(
          stock?.priority ??
          master?.priority
        )
    };
  }

  function isValidStock(stock) {
    return Boolean(
      stock &&
      stock.symbol &&
      stock.price > 0 &&
      Number.isFinite(
        stock.change
      )
    );
  }

  function getStocksFromMarketData() {
    const data =
      Array.isArray(
        window.MARKET_DATA
      )
        ? window.MARKET_DATA
        : [];

    return data
      .map(normalizeStock)
      .filter(isValidStock);
  }

  /* ============================================================
     DAILY RANKING
     ============================================================ */

  function smartRankStocks(
    stocks
  ) {
    return stocks
      .map(stock => {
        const momentum =
          Math.max(
            -5,
            Math.min(
              5,
              safeNumber(
                stock.chartScore
              )
            )
          );

        const engineScore =
          safeNumber(
            stock.change
          ) +
          momentum * 0.10 +
          safeNumber(
            stock.priority
          ) * 0.001;

        return {
          ...stock,
          momentum,
          engineScore
        };
      })
      .sort((a, b) => {
        if (
          b.engineScore !==
          a.engineScore
        ) {
          return (
            b.engineScore -
            a.engineScore
          );
        }

        if (
          b.change !==
          a.change
        ) {
          return (
            b.change -
            a.change
          );
        }

        return String(
          a.symbol
        ).localeCompare(
          String(b.symbol)
        );
      })
      .map(
        (stock, index) => ({
          ...stock,

          /*
            ALWAYS 1-based.
          */
          dailyRank:
            index + 1
        })
      );
  }

  /* ============================================================
     MONTHLY MEMORY
     ============================================================ */

  function normalizeMonthlyRecord(
    record
  ) {
    if (
      !record ||
      typeof record !==
        "object" ||
      !record.month ||
      !Array.isArray(
        record.symbols
      )
    ) {
      return null;
    }

    const symbols =
      record.symbols
        .map(
          normalizeSymbol
        )
        .filter(Boolean)
        .slice(
          0,
          TARGET_TOP20
        );

    if (
      symbols.length !==
      TARGET_TOP20
    ) {
      return null;
    }

    return {
      month:
        record.month,

      symbols,

      createdAt:
        record.createdAt ||
        new Date().toISOString(),

      updatedAt:
        record.updatedAt ||
        new Date().toISOString(),

      source:
        record.source ||
        "existing"
    };
  }

  function getSavedMonthlyMemory() {
    const month =
      currentMonthKey();

    const current =
      normalizeMonthlyRecord(
        storageRead(
          MONTHLY_KEY
        )
      );

    if (
      current &&
      current.month === month
    ) {
      return current;
    }

    /*
      Migrate old monthly snapshot
      without changing its symbols.
    */
    for (
      const key of
      OLD_MONTHLY_KEYS
    ) {
      const old =
        normalizeMonthlyRecord(
          storageRead(key)
        );

      if (
        old &&
        old.month === month
      ) {
        const migrated = {
          ...old,

          updatedAt:
            new Date().toISOString(),

          source:
            "migrated_to_v13"
        };

        storageWrite(
          MONTHLY_KEY,
          migrated
        );

        return migrated;
      }
    }

    return null;
  }

  function saveMonthlyTop20(
    ranked,
    reason =
      "new_month_snapshot"
  ) {
    const existing =
      getSavedMonthlyMemory();

    /*
      NEVER overwrite current month.
    */
    if (existing) {
      return existing;
    }

    if (
      !Array.isArray(ranked) ||
      ranked.length <
        TARGET_TOP20
    ) {
      return null;
    }

    const symbols =
      ranked
        .slice(
          0,
          TARGET_TOP20
        )
        .map(
          stock =>
            normalizeSymbol(
              stock.symbol
            )
        )
        .filter(Boolean);

    if (
      symbols.length !==
      TARGET_TOP20
    ) {
      return null;
    }

    const record = {
      month:
        currentMonthKey(),

      symbols,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      source:
        reason
    };

    storageWrite(
      MONTHLY_KEY,
      record
    );

    return record;
  }

  function ensureMonthlyTop20(
    ranked
  ) {
    const existing =
      getSavedMonthlyMemory();

    if (existing) {
      return existing;
    }

    return saveMonthlyTop20(
      ranked
    );
  }

  function getMonthlyStocks(
    ranked,
    monthlyMemory
  ) {
    if (
      !monthlyMemory ||
      !Array.isArray(
        monthlyMemory.symbols
      )
    ) {
      return [];
    }

    const bySymbol =
      new Map(
        ranked.map(stock => [
          normalizeSymbol(
            stock.symbol
          ),
          stock
        ])
      );

    return monthlyMemory.symbols
      .map(symbol =>
        bySymbol.get(
          normalizeSymbol(
            symbol
          )
        )
      )
      .filter(Boolean)
      .map(
        (stock, index) => ({
          ...stock,

          monthlyRank:
            index + 1
        })
      );
  }

  /* ============================================================
     DAILY MONITORING
     ============================================================ */

  function loadDailyMonitoring() {
    const today =
      todayKey();

    const current =
      storageRead(
        DAILY_KEY
      );

    if (
      current &&
      current.date === today &&
      current.records &&
      typeof current.records ===
        "object"
    ) {
      return current;
    }

    for (
      const key of
      OLD_DAILY_KEYS
    ) {
      const old =
        storageRead(key);

      if (
        old &&
        old.date === today
      ) {
        const migrated = {
          ...old,

          updatedAt:
            new Date().toISOString()
        };

        storageWrite(
          DAILY_KEY,
          migrated
        );

        return migrated;
      }
    }

    return {
      date: today,
      records: {}
    };
  }

  function buildMonitoring(
    ranked,
    monthlyMemory
  ) {
    const monthlySymbols =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    const records = {};

    ranked.forEach(stock => {
      const symbol =
        normalizeSymbol(
          stock.symbol
        );

      const inMonthly =
        monthlySymbols.has(
          symbol
        );

      let state;
      let reason;

      if (inMonthly) {
        if (
          stock.dailyRank <=
          TARGET_TOP20
        ) {
          state = "HOLD";

          reason =
            "Monthly Top-20 holding strong hai; daily fluctuation se automatic exit nahi.";
        } else if (
          stock.dailyRank <= 30
        ) {
          state = "WATCH";

          reason =
            "Daily rank Top-20 se bahar hai, lekin automatic exit nahi.";
        } else {
          state = "EXIT REVIEW";

          reason =
            "Daily rank 30 se bahar hai; detailed review required.";
        }
      } else {
        if (
          stock.dailyRank <=
          TARGET_TOP20
        ) {
          state = "IMPROVING";

          reason =
            "Current daily Top-20 mein improve hua hai; next monthly review candidate.";
        } else {
          state = "WATCH";

          reason =
            "Daily ranking Top-20 ke bahar hai.";
        }
      }

      records[symbol] = {
        symbol,

        dailyRank:
          stock.dailyRank,

        state,

        reason,

        updatedAt:
          new Date().toISOString()
      };
    });

    const result = {
      date:
        todayKey(),

      records,

      updatedAt:
        new Date().toISOString()
    };

    storageWrite(
      DAILY_KEY,
      result
    );

    return result;
  }

  function getMonitoringState(
    monitoring,
    symbol
  ) {
    return (
      monitoring?.records?.[
        normalizeSymbol(symbol)
      ] ||
      null
    );
  }

  /* ============================================================
     ELIGIBILITY
     ============================================================ */

  function getExitReviewStocks(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(
      stock =>
        getMonitoringState(
          monitoring,
          stock.symbol
        )?.state ===
        "EXIT REVIEW"
    );
  }

  function getFreshInvestmentCandidates(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(
      stock =>
        getMonitoringState(
          monitoring,
          stock.symbol
        )?.state !==
        "EXIT REVIEW"
    );
  }

  function getReplacementCandidates(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthlySymbols =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    return ranked
      .filter(stock => {
        const symbol =
          normalizeSymbol(
            stock.symbol
          );

        if (
          monthlySymbols.has(
            symbol
          )
        ) {
          return false;
        }

        const state =
          getMonitoringState(
            monitoring,
            symbol
          );

        return (
          stock.dailyRank <=
          TARGET_TOP20 &&
          state?.state ===
            "IMPROVING"
        );
      })
      .slice(
        0,
        REPLACEMENT_POOL_SIZE
      );
  }

  /* ============================================================
     ALLOCATION
     ============================================================ */

  function getStockLimitPercent(
    budget
  ) {
    if (
      budget <
      SMALL_BUDGET_THRESHOLD
    ) {
      return SMALL_BUDGET_MAX_STOCK;
    }

    return NORMAL_MAX_STOCK;
  }

  function canAddStock(
    stock,
    selected,
    budget,
    balance
  ) {
    if (
      !stock ||
      stock.price <= 0 ||
      stock.price >
        balance +
          0.000001
    ) {
      return false;
    }

    const existing =
      selected.find(
        item =>
          item.symbol ===
          stock.symbol
      );

    const currentQuantity =
      safeNumber(
        existing?.quantity
      );

    const nextQuantity =
      currentQuantity + 1;

    const nextInvestment =
      nextQuantity *
      stock.price;

    /*
      Both normal and hard limits apply.
    */
    const individualLimit =
      Math.min(
        getStockLimitPercent(
          budget
        ),
        HARD_MAX_STOCK
      );

    if (
      nextInvestment >
      budget *
        individualLimit +
        0.01
    ) {
      return false;
    }

    const sectorAmount =
      selected
        .filter(
          item =>
            item.sector ===
            stock.sector
        )
        .reduce(
          (sum, item) =>
            sum +
            safeNumber(
              item.investment
            ),
          0
        );

    const groupAmount =
      selected
        .filter(
          item =>
            item.businessGroup ===
            stock.businessGroup
        )
        .reduce(
          (sum, item) =>
            sum +
            safeNumber(
              item.investment
            ),
          0
        );

    if (
      sectorAmount +
        stock.price >
      budget *
        MAX_SECTOR_ALLOCATION +
        0.01
    ) {
      return false;
    }

    if (
      groupAmount +
        stock.price >
      budget *
        MAX_GROUP_ALLOCATION +
        0.01
    ) {
      return false;
    }

    return true;
  }

  function allocationScore(
    stock,
    selected,
    budget
  ) {
    const existing =
      selected.find(
        item =>
          item.symbol ===
          stock.symbol
      );

    const currentInvestment =
      safeNumber(
        existing?.investment
      );

    const gap =
      Math.max(
        0,
        stock.targetAmount -
          currentInvestment
      );

    const gapScore =
      budget > 0
        ? gap / budget
        : 0;

    const rankScore =
      stock.rankIndex >= 0
        ? 1 /
          (1 +
            stock.rankIndex)
        : 0;

    const sameSector =
      selected
        .filter(
          item =>
            item.sector ===
            stock.sector
        )
        .length;

    const sameGroup =
      selected
        .filter(
          item =>
            item.businessGroup ===
            stock.businessGroup
        )
        .length;

    const diversification =
      1 /
      (1 +
        sameSector +
        sameGroup);

    const priceUtilization =
      budget > 0
        ? stock.price / budget
        : 0;

    const momentum =
      safeNumber(
        stock.momentum
      );

    return (
      gapScore * 6 +
      rankScore * 2 +
      diversification * 2 +
      priceUtilization * 0.5 +
      momentum * 0.05
    );
  }

  function buildSmartPlan(
    stocks,
    budget
  ) {
    const candidates =
      stocks.map(
        (stock, index) => ({
          ...stock,

          rankIndex:
            index,

          rankWeight:
            stocks.length -
            index,

          quantity: 0,

          investment: 0
        })
      );

    const weightTotal =
      candidates.reduce(
        (sum, stock) =>
          sum +
          stock.rankWeight,
        0
      );

    candidates.forEach(
      stock => {
        stock.targetPercent =
          weightTotal > 0
            ? stock.rankWeight /
              weightTotal
            : 0;

        stock.targetAmount =
          budget *
          stock.targetPercent;
      }
    );

    const selected = [];
    let balance =
      budget;

    /*
      Diversification pass.
    */
    const diversityCandidates =
      [...candidates]
        .filter(
          stock =>
            stock.price <=
            balance
        )
        .sort(
          (a, b) => {
            const aValue =
              a.rankWeight /
              Math.max(
                1,
                a.price
              );

            const bValue =
              b.rankWeight /
              Math.max(
                1,
                b.price
              );

            return bValue - aValue;
          }
        );

    for (
      const stock of
      diversityCandidates
    ) {
      if (
        selected.length >=
        Math.min(
          MIN_DIVERSIFIED_STOCKS,
          candidates.length
        )
      ) {
        break;
      }

      if (
        stock.price >
        balance
      ) {
        continue;
      }

      if (
        !canAddStock(
          stock,
          selected,
          budget,
          balance
        )
      ) {
        continue;
      }

      stock.quantity = 1;
      stock.investment =
        stock.price;

      selected.push(
        stock
      );

      balance -=
        stock.price;
    }

    /*
      Whole-share optimization.
    */
    let guard = 0;

    while (
      balance > 0.01 &&
      guard < 20000
    ) {
      guard++;

      let best = null;
      let bestScore =
        -Infinity;

      for (
        const stock of
        candidates
      ) {
        if (
          stock.price >
          balance +
            0.000001
        ) {
          continue;
        }

        if (
          !canAddStock(
            stock,
            selected,
            budget,
            balance
          )
        ) {
          continue;
        }

        const score =
          allocationScore(
            stock,
            selected,
            budget
          );

        if (
          score >
          bestScore
        ) {
          bestScore =
            score;

          best =
            stock;
        }
      }

      if (!best) {
        break;
      }

      const existingIndex =
        selected.findIndex(
          item =>
            item.symbol ===
            best.symbol
        );

      if (
        existingIndex >=
        0
      ) {
        const item =
          selected[
            existingIndex
          ];

        item.quantity += 1;

        item.investment =
          item.quantity *
          item.price;

        balance -=
          item.price;
      } else {
        best.quantity = 1;

        best.investment =
          best.price;

        selected.push(
          best
        );

        balance -=
          best.price;
      }
    }

    const invested =
      selected.reduce(
        (sum, stock) =>
          sum +
          safeNumber(
            stock.investment
          ),
        0
      );

    const finalBalance =
      Math.max(
        0,
        budget -
          invested
      );

    selected.forEach(
      stock => {
        stock.actualPercent =
          budget > 0
            ? stock.investment /
              budget
            : 0;
      }
    );

    return {
      budget,

      selected,

      selectedCount:
        selected.length,

      invested,

      balance:
        finalBalance,

      concentration:
        calculateConcentration(
          selected,
          budget
        )
    };
  }

  function calculateConcentration(
    selected,
    total
  ) {
    const sectors = {};
    const groups = {};

    selected.forEach(
      stock => {
        const investment =
          safeNumber(
            stock.investment
          );

        sectors[
          stock.sector
        ] =
          (
            sectors[
              stock.sector
            ] || 0
          ) +
          investment;

        groups[
          stock.businessGroup
        ] =
          (
            groups[
              stock.businessGroup
            ] || 0
          ) +
          investment;
      }
    );

    return {
      sectors,
      groups,

      sectorPercent:
        Object.fromEntries(
          Object.entries(
            sectors
          ).map(
            ([key, value]) => [
              key,
              total > 0
                ? value / total
                : 0
            ]
          )
        ),

      groupPercent:
        Object.fromEntries(
          Object.entries(
            groups
          ).map(
            ([key, value]) => [
              key,
              total > 0
                ? value / total
                : 0
            ]
          )
        )
    };
  }

  /* ============================================================
     VALIDATION
     ============================================================ */

  function validatePlan(
    plan
  ) {
    const budget =
      safeNumber(
        plan.budget
      );

    const total =
      plan.selected.reduce(
        (sum, stock) =>
          sum +
          safeNumber(
            stock.investment
          ),
        0
      );

    if (
      Math.abs(
        total -
          plan.invested
      ) > 0.01
    ) {
      throw new Error(
        "Allocation validation failed: total mismatch."
      );
    }

    if (
      total >
      budget + 0.01
    ) {
      throw new Error(
        "Allocation validation failed: budget exceeded."
      );
    }

    const sectorTotals = {};
    const groupTotals = {};

    for (
      const stock of
      plan.selected
    ) {
      const quantity =
        safeNumber(
          stock.quantity
        );

      if (
        quantity <= 0
      ) {
        continue;
      }

      const investment =
        safeNumber(
          stock.investment
        );

      const stockPercent =
        budget > 0
          ? investment /
            budget
          : 0;

      /*
        Normal / small-budget limit.
      */
      const normalAllowed =
        getStockLimitPercent(
          budget
        );

      if (
        stockPercent >
        normalAllowed +
          0.000001
      ) {
        throw new Error(
          `${stock.symbol} individual allocation limit exceeded.`
        );
      }

      /*
        Hard 35% limit.
      */
      if (
        stockPercent >
        HARD_MAX_STOCK +
          0.000001
      ) {
        throw new Error(
          `${stock.symbol} exceeds 35% hard limit.`
        );
      }

      sectorTotals[
        stock.sector
      ] =
        (
          sectorTotals[
            stock.sector
          ] || 0
        ) +
        investment;

      groupTotals[
        stock.businessGroup
      ] =
        (
          groupTotals[
            stock.businessGroup
          ] || 0
        ) +
        investment;
    }

    for (
      const sector of
      Object.keys(
        sectorTotals
      )
    ) {
      if (
        sectorTotals[
          sector
        ] >
        budget *
          MAX_SECTOR_ALLOCATION +
          0.01
      ) {
        throw new Error(
          `${sector} sector allocation limit exceeded.`
        );
      }
    }

    for (
      const group of
      Object.keys(
        groupTotals
      )
    ) {
      if (
        groupTotals[
          group
        ] >
        budget *
          MAX_GROUP_ALLOCATION +
          0.01
      ) {
        throw new Error(
          `${group} business-group allocation limit exceeded.`
        );
      }
    }

    return true;
  }

  /* ============================================================
     PORTFOLIO
     ============================================================ */

  function savePlanAsTrackedPortfolio(
    plan
  ) {
    const positions =
      plan.selected.map(
        stock => ({
          symbol:
            stock.symbol,

          name:
            stock.name,

          quantity:
            stock.quantity,

          averagePrice:
            stock.price,

          invested:
            stock.investment,

          currentPrice:
            stock.price,

          currentValue:
            stock.investment,

          updatedAt:
            new Date().toISOString()
        })
      );

    const tracked = {
      version:
        "v13",

      updatedAt:
        new Date().toISOString(),

      budget:
        plan.budget,

      invested:
        plan.invested,

      currentValue:
        positions.reduce(
          (sum, position) =>
            sum +
            safeNumber(
              position.currentValue
            ),
          0
        ),

      positions
    };

    storageWrite(
      PORTFOLIO_KEY,
      tracked
    );

    return tracked;
  }

  function renderTrackedPortfolio() {
    const portfolio =
      storageRead(
        PORTFOLIO_KEY
      );

    if (
      !portfolio ||
      !Array.isArray(
        portfolio.positions
      )
    ) {
      return `
        <p>No active tracked portfolio.</p>
      `;
    }

    const invested =
      portfolio.positions.reduce(
        (sum, position) =>
          sum +
          safeNumber(
            position.invested
          ),
        0
      );

    const value =
      portfolio.positions.reduce(
        (sum, position) =>
          sum +
          safeNumber(
            position.currentValue
          ),
        0
      );

    const pnl =
      value -
      invested;

    const pnlPercent =
      invested > 0
        ? pnl /
          invested *
          100
        : 0;

    return `
      <div class="portfolio-summary">
        <strong>Tracked Invested:</strong>
        ${money(invested)}
        <br>

        <strong>Current Value:</strong>
        ${money(value)}
        <br>

        <strong>P/L:</strong>
        ${pnl >= 0 ? "+" : ""}
        ${money(pnl)}
        (${percent(pnlPercent)})
      </div>
    `;
  }

  /* ============================================================
     TOP 20
     ============================================================ */

  function renderTop20(
    ranked
  ) {
    if (!top20List) {
      return;
    }

    const top =
      ranked.slice(
        0,
        TARGET_TOP20
      );

    top20List.innerHTML =
      top
        .map(
          (stock, index) => `
            <div class="top20-item">
              <div>
                <strong>
                  ${index + 1}
                </strong>

                ${escapeHtml(
                  stock.name
                )}
              </div>

              <div>
                ${escapeHtml(
                  stock.symbol
                )}
                •
                ${escapeHtml(
                  stock.sector
                )}
              </div>

              <div>
                ${
                  stock.change >=
                  0
                    ? "+"
                    : ""
                }${percent(
                  stock.change
                )}
              </div>

              <div>
                ${money(
                  stock.price
                )}
              </div>
            </div>
          `
        )
        .join("");
  }

  /* ============================================================
     WATCHLIST
     ============================================================ */

  function renderWatchlist(
    ranked,
    monthlyMemory
  ) {
    const element =
      document.getElementById(
        "watchlist"
      );

    if (!element) {
      return;
    }

    const monthly =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    const watch =
      ranked
        .filter(stock => {
          const symbol =
            normalizeSymbol(
              stock.symbol
            );

          return (
            !monthly.has(
              symbol
            ) &&
            stock.dailyRank >
              TARGET_TOP20
          );
        })
        .slice(0, 3);

    element.innerHTML =
      watch.length
        ? watch
            .map(
              stock => `
                <div>
                  <strong>
                    ${escapeHtml(
                      stock.name
                    )}
                  </strong>
                  <br>
                  ${escapeHtml(
                    stock.sector
                  )}
                  <br>
                  <strong>
                    WATCH
                  </strong>
                </div>
              `
            )
            .join("")
        : `
          <div>
            No watch candidates.
          </div>
        `;
  }

  /* ============================================================
     MONITORING UI
     ============================================================ */

  function renderMonitoring(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthly =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    let html = `
      <hr>

      <h3>
        📊 Monthly Top-20 Monitoring
      </h3>

      <p>
        Monthly snapshot locked hai.
        Daily ranking sirf monitoring ke liye hai.
      </p>
    `;

    ranked.forEach(
      stock => {
        const symbol =
          normalizeSymbol(
            stock.symbol
          );

        const state =
          getMonitoringState(
            monitoring,
            symbol
          );

        if (!state) {
          return;
        }

        const relevant =
          monthly.has(symbol) ||
          state.state ===
            "IMPROVING" ||
          state.state ===
            "EXIT REVIEW";

        if (!relevant) {
          return;
        }

        html += `
          <div class="monitor-item">
            <strong>
              ${escapeHtml(
                stock.name
              )}
            </strong>

            <br>

            ${escapeHtml(
              stock.symbol
            )}

            —

            Daily Rank #${stock.dailyRank}

            —

            <strong>
              ${escapeHtml(
                state.state
              )}
            </strong>

            <br>

            ${escapeHtml(
              state.reason
            )}
          </div>
        `;
      }
    );

    return html;
  }

  /* ============================================================
     REPLACEMENTS
     ============================================================ */

  function renderReplacementCandidates(
    candidates,
    exitReviews
  ) {
    let html = `
      <hr>
      <h3>
        🔄 Replacement Candidates
      </h3>
    `;

    if (
      !candidates.length
    ) {
      html += `
        <p>
          No fresh replacement candidate right now.
        </p>
      `;
    } else {
      html += "<ul>";

      candidates.forEach(
        stock => {
          html += `
            <li>
              <strong>
                ${escapeHtml(
                  stock.name
                )}
              </strong>
              —
              ${escapeHtml(
                stock.symbol
              )}
              —
              Daily Rank #${stock.dailyRank}
              —
              IMPROVING
            </li>
          `;
        }
      );

      html += "</ul>";
    }

    if (
      exitReviews.length
    ) {
      html += `
        <p>
          ⚠️ EXIT REVIEW:
          ${exitReviews
            .map(
              stock =>
                `<strong>${escapeHtml(
                  stock.symbol
                )}</strong>`
            )
            .join(", ")}
        </p>
      `;
    }

    return html;
  }

  /* ============================================================
     PLAN UI
     ============================================================ */

  function renderPlan(
    plan,
    decisionStocks
  ) {
    let html = `
      <div class="ai-plan">

        <h3>
          🤖 AI Investment Plan
        </h3>

        <p>
          Investment:
          <strong>
            ${money(
              plan.budget
            )}
          </strong>
        </p>

        <p>
          Decision:
          <strong>
            MONTHLY TOP-20
          </strong>
        </p>

        <p>
          Eligible Stocks:
          <strong>
            ${decisionStocks.length}
          </strong>
        </p>

        <p>
          Selected:
          <strong>
            ${plan.selectedCount}
          </strong>
        </p>

        <p>
          Invested:
          <strong>
            ${money(
              plan.invested
            )}
          </strong>
        </p>

        <p>
          Balance:
          <strong>
            ${money(
              plan.balance
            )}
          </strong>
        </p>

      </div>

      <div style="overflow-x:auto;">

        <table>

          <thead>
            <tr>
              <th>#</th>
              <th>Company</th>
              <th>Price</th>
              <th>Shares</th>
              <th>Investment</th>
              <th>Actual %</th>
              <th>Sector</th>
            </tr>
          </thead>

          <tbody>
    `;

    plan.selected.forEach(
      (stock, index) => {
        const actual =
          plan.budget > 0
            ? stock.investment /
              plan.budget *
              100
            : 0;

        html += `
          <tr>

            <td>
              <strong>
                ${index + 1}
              </strong>
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  stock.symbol
                )}
              </strong>
              <br>
              ${escapeHtml(
                stock.name
              )}
            </td>

            <td>
              ${money(
                stock.price
              )}
            </td>

            <td>
              <strong>
                ${stock.quantity}
              </strong>
            </td>

            <td>
              ${money(
                stock.investment
              )}
            </td>

            <td>
              ${percent(
                actual
              )}
            </td>

            <td>
              ${escapeHtml(
                stock.sector
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

      <hr>

      <h3>
        🧠 Decision Logic
      </h3>

      <ul>
        <li>
          Monthly Top-20 is the primary
          investment decision.
        </li>

        <li>
          Daily ranking is monitoring only.
        </li>

        <li>
          Daily fluctuation does not
          automatically trigger BUY/SELL.
        </li>

        <li>
          Monthly snapshot is never
          overwritten during the month.
        </li>

        <li>
          Rank above 30 for a monthly
          holding triggers EXIT REVIEW.
        </li>

        <li>
          EXIT REVIEW stocks are excluded
          from fresh allocation.
        </li>

        <li>
          Improving stocks become candidates
          for the next monthly review.
        </li>

        <li>
          Whole shares only.
        </li>

        <li>
          Individual stock limit:
          <strong>20%</strong>
        </li>

        <li>
          Small budget limit:
          <strong>25%</strong>
        </li>

        <li>
          Hard maximum:
          <strong>35%</strong>
        </li>

        <li>
          Sector maximum:
          <strong>40%</strong>
        </li>

        <li>
          Business group maximum:
          <strong>30%</strong>
        </li>

        <li>
          Budget cannot be exceeded.
        </li>

        <li>
          Only available live market data
          is used.
        </li>
      </ul>

      <hr>

      <h3>
        💰 Investment Tracking
      </h3>

      ${renderTrackedPortfolio()}
    `;

    return html;
  }

  /* ============================================================
     MAIN ANALYSIS
     ============================================================ */

  async function analyzeInvestmentAmount(
    amount
  ) {
    const budget =
      safeNumber(amount);

    if (
      budget <= 0
    ) {
      throw new Error(
        "Please valid investment amount enter karein."
      );
    }

    const stocks =
      getStocksFromMarketData();

    if (
      stocks.length <
      TARGET_TOP20
    ) {
      throw new Error(
        "Live market data incomplete hai. Pehle Connect Live Market Data karein."
      );
    }

    const ranked =
      smartRankStocks(
        stocks
      );

    /*
      IMPORTANT:
      Existing monthly snapshot is
      preserved.
    */
    const monthlyMemory =
      ensureMonthlyTop20(
        ranked
      );

    if (!monthlyMemory) {
      throw new Error(
        "Monthly Top-20 snapshot create nahi ho paya."
      );
    }

    const monitoring =
      buildMonitoring(
        ranked,
        monthlyMemory
      );

    renderTop20(
      ranked
    );

    renderWatchlist(
      ranked,
      monthlyMemory
    );

    const monthlyStocks =
      getMonthlyStocks(
        ranked,
        monthlyMemory
      );

    if (
      monthlyStocks.length === 0
    ) {
      throw new Error(
        "Monthly Top-20 stocks live data mein available nahi hain."
      );
    }

    const exitReviews =
      getExitReviewStocks(
        monthlyStocks,
        monitoring
      );

    const decisionStocks =
      getFreshInvestmentCandidates(
        monthlyStocks,
        monitoring
      );

    const replacements =
      getReplacementCandidates(
        ranked,
        monthlyMemory,
        monitoring
      );

    if (
      decisionStocks.length === 0
    ) {
      throw new Error(
        "Saare monthly stocks EXIT REVIEW mein hain. Fresh allocation generate nahi kiya gaya."
      );
    }

    const plan =
      buildSmartPlan(
        decisionStocks,
        budget
      );

    if (
      plan.selectedCount === 0
    ) {
      throw new Error(
        "Is budget par koi valid whole-share allocation nahi ban paya."
      );
    }

    /*
      FINAL VALIDATION
    */
    validatePlan(
      plan
    );

    savePlanAsTrackedPortfolio(
      plan
    );

    if (
      recommendation
    ) {
      recommendation.innerHTML =
        renderPlan(
          plan,
          decisionStocks
        ) +

        renderReplacementCandidates(
          replacements,
          exitReviews
        ) +

        renderMonitoring(
          ranked,
          monthlyMemory,
          monitoring
        );
    }

    return {
      ranked,
      monthlyMemory,
      monitoring,
      monthlyStocks,
      exitReviews,
      decisionStocks,
      replacements,
      plan
    };
  }

  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;

  /* ============================================================
     CONNECT LIVE MARKET DATA
     ============================================================ */

  if (connectButton) {
    connectButton.addEventListener(
      "click",
      async () => {
        try {
          connectButton.disabled =
            true;

          /*
            TOTP input is intentionally NOT
            sent to /api/quotes because the
            supplied backend uses
            NEO_ACCESS_TOKEN.
          */

          const stocks =
            await window.fetchMarketData();

          if (
            !Array.isArray(
              stocks
            ) ||
            stocks.length <
              TARGET_TOP20
          ) {
            throw new Error(
              `Only ${stocks?.length || 0} valid stocks received.`
            );
          }

          const ranked =
            smartRankStocks(
              stocks
            );

          const monthlyMemory =
            ensureMonthlyTop20(
              ranked
            );

          if (!monthlyMemory) {
            throw new Error(
              "Monthly Top-20 memory create nahi hui."
            );
          }

          const monitoring =
            buildMonitoring(
              ranked,
              monthlyMemory
            );

          renderTop20(
            ranked
          );

          renderWatchlist(
            ranked,
            monthlyMemory
          );

          const status =
            document.getElementById(
              "marketStatus"
            );

          if (status) {
            status.textContent =
              `LIVE • ${stocks.length}/50`;
          }

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div class="live-success">

                <h3>
                  ✅ Live Market Data Connected
                </h3>

                <p>
                  <strong>
                    ${stocks.length}/50
                  </strong>
                  Nifty 50 stocks received.
                </p>

                <p>
                  Market:
                  <strong>LIVE</strong>
                </p>

                <p>
                  Monthly Snapshot:
                  <strong>
                    ${escapeHtml(
                      monthlyMemory.month
                    )}
                  </strong>
                </p>

                <p>
                  Daily Monitoring:
                  <strong>
                    ACTIVE
                  </strong>
                </p>

              </div>

              ${renderMonitoring(
                ranked,
                monthlyMemory,
                monitoring
              )}
            `;
          }

        } catch (error) {
          console.error(
            "LIVE MARKET DATA ERROR:",
            error
          );

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div class="error-box">

                <strong>
                  ⚠️ Live Market Data Error
                </strong>

                <p>
                  ${escapeHtml(
                    error?.message ||
                    "Live market data connect nahi ho paya."
                  )}
                </p>

              </div>
            `;
          }

          alert(
            error?.message ||
            "Live market data connect nahi ho paya."
          );

        } finally {
          connectButton.disabled =
            false;
        }
      }
    );
  }

  /* ============================================================
     ANALYZE BUTTON
     ============================================================ */

  if (analyzeButton) {
    analyzeButton.addEventListener(
      "click",
      async () => {
        try {
          const amount =
            safeNumber(
              amountInput?.value
            );

          if (
            amount <= 0
          ) {
            alert(
              "Please valid investment amount enter karein."
            );

            return;
          }

          const stocks =
            getStocksFromMarketData();

          if (
            stocks.length <
            TARGET_TOP20
          ) {
            alert(
              "Pehle Connect Live Market Data karke live quotes load karein."
            );

            return;
          }

          analyzeButton.disabled =
            true;

          await analyzeInvestmentAmount(
            amount
          );

        } catch (error) {
          console.error(
            "ANALYSIS ERROR:",
            error
          );

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div class="error-box">

                <strong>
                  ⚠️ Analysis Error
                </strong>

                <p>
                  ${escapeHtml(
                    error?.message ||
                    "Investment analysis failed."
                  )}
                </p>

              </div>
            `;
          }

          alert(
            error?.message ||
            "Investment analysis failed."
          );

        } finally {
          analyzeButton.disabled =
            false;
        }
      }
    );
  }

  /* ============================================================
     INITIAL RENDER
     ------------------------------------------------------------
     IMPORTANT:
     Initial render does NOT call /api/quotes.
     Live API is called only when the user
     presses Connect Live Market Data.
     ============================================================ */

  try {
    const stocks =
      getStocksFromMarketData();

    if (
      stocks.length >=
      TARGET_TOP20
    ) {
      const ranked =
        smartRankStocks(
          stocks
        );

      const monthlyMemory =
        ensureMonthlyTop20(
          ranked
        );

      if (monthlyMemory) {
        const monitoring =
          buildMonitoring(
            ranked,
            monthlyMemory
          );

        renderTop20(
          ranked
        );

        renderWatchlist(
          ranked,
          monthlyMemory
        );

        console.log(
          "Prototype-1 existing market data loaded:",
          stocks.length
        );
      }
    }
  } catch (error) {
    console.warn(
      "Initial render skipped:",
      error
    );
  }

  console.log(
    "Prototype-1 App Engine V13 FIXED loaded."
  );

})();
