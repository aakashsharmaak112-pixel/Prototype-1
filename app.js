/* ============================================================
   PROTOTYPE-1 — APP ENGINE V13.1
   ============================================================

   BASE:
   - V12 working engine preserved
   - Monthly Top-20 snapshot locked
   - Daily ranking always starts from #1
   - Daily monitoring does NOT overwrite monthly decision
   - EXIT REVIEW excluded from fresh allocation
   - Replacement candidates shown separately
   - Whole-share allocation
   - Final allocation validation
   - Live Kotak Neo response mapping made robust
   - Supports:
       1) window.MARKET_DATA = [...]
       2) fetchMarketData() => [...]
       3) fetchMarketData() => { stocks: [...] }
       4) fetchMarketData() => { data: { stocks: [...] } }
       5) quote records containing displaySymbol such as ADANIENT-EQ

   IMPORTANT:
   - quotes.js / Kotak Neo API flow is NOT modified here.
   ============================================================ */

(() => {
  "use strict";

  /* ==========================================================
     CONFIG
  ========================================================== */

  const TARGET_TOP20 = 20;

  const NORMAL_MAX_STOCK = 0.20;

  const SMALL_BUDGET_THRESHOLD = 20000;
  const SMALL_BUDGET_MAX_STOCK = 0.25;

  const HARD_MAX_STOCK = 0.35;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const MIN_DIVERSIFIED_STOCKS = 5;
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

  const OLD_PORTFOLIO_KEYS = [
    "prototype1_portfolio_v12",
    "prototype1_portfolio_v11",
    "prototype1_portfolio_v10",
    "prototype1_portfolio_v7",
    "prototype1_portfolio_v6",
    "prototype1_portfolio_v5"
  ];

  /* ==========================================================
     DOM
  ========================================================== */

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

  /* ==========================================================
     BASIC HELPERS
  ========================================================== */

  function safeNumber(value, fallback = 0) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

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

  /* ==========================================================
     SYMBOL NORMALIZATION
  ========================================================== */

  function normalizeSymbol(symbol) {
    let value =
      String(symbol || "")
        .trim()
        .toUpperCase();

    /*
      Kotak can return:
        ADANIENT-EQ
        ADANIENT
        nse_cm|25
      We only remove the suffix here.
    */

    if (
      value.includes("|")
    ) {
      value =
        value.split("|").pop();
    }

    value =
      value
        .replace(/-EQ$/i, "")
        .replace(/\s+/g, "");

    return value;
  }

  function getRawSymbol(stock) {
    if (!stock) {
      return "";
    }

    return (
      stock.symbol ||
      stock.tradingsymbol ||
      stock.tradingSymbol ||
      stock.ticker ||
      stock.displaySymbol ||
      stock.display_symbol ||
      ""
    );
  }

  /* ==========================================================
     STORAGE
  ========================================================== */

  function storageRead(
    key,
    fallback = null
  ) {
    try {
      const raw =
        localStorage.getItem(key);

      return raw
        ? JSON.parse(raw)
        : fallback;
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
    } catch {
      return false;
    }
  }

  /* ==========================================================
     MASTER NIFTY LOOKUP
  ========================================================== */

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
      HDFCBANK: "HDFC Group",
      HDFCLIFE: "HDFC Group",

      ICICIBANK: "ICICI Group",

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
      groups[s] || s
    );
  }

  /* ==========================================================
     STOCK NORMALIZATION
  ========================================================== */

  function normalizeStock(
    stock
  ) {
    if (
      !stock ||
      typeof stock !== "object"
    ) {
      return null;
    }

    const rawSymbol =
      getRawSymbol(stock);

    const symbol =
      normalizeSymbol(
        rawSymbol
      );

    if (!symbol) {
      return null;
    }

    const master =
      findNiftyStock(symbol);

    /*
      Kotak response:
        ltp
        perChange
        displaySymbol

      Older frontend:
        price
        change
        changePercent
        pChange
    */

    const price =
      safeNumber(
        stock.price ??
        stock.lastPrice ??
        stock.ltp ??
        stock.LTP ??
        stock.last_traded_price
      );

    const change =
      safeNumber(
        stock.changePercent ??
        stock.perChange ??
        stock.per_change ??
        stock.pChange ??
        stock.change ??
        stock.percentChange
      );

    const displaySymbol =
      String(
        stock.displaySymbol ||
        stock.display_symbol ||
        stock.tradingsymbol ||
        stock.tradingSymbol ||
        rawSymbol ||
        symbol
      );

    return {
      ...stock,

      symbol,

      displaySymbol,

      name:
        stock.name ||
        stock.companyName ||
        stock.company_name ||
        master?.name ||
        symbol,

      sector:
        stock.sector ||
        master?.sector ||
        "Other",

      businessGroup:
        stock.businessGroup ||
        stock.group ||
        master?.businessGroup ||
        inferBusinessGroup(symbol),

      price,

      change,

      chartScore:
        safeNumber(
          stock.chartScore
        ),

      fundamentalScore:
        safeNumber(
          stock.fundamentalScore
        ),

      newsScore:
        safeNumber(
          stock.newsScore
        ),

      priority:
        safeNumber(
          stock.priority ??
          master?.priority
        )
    };
  }

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

  /* ==========================================================
     ROBUST MARKET RESPONSE MAPPER
  ========================================================== */

  function extractMarketArray(
    payload
  ) {
    if (
      Array.isArray(payload)
    ) {
      return payload;
    }

    if (
      !payload ||
      typeof payload !== "object"
    ) {
      return [];
    }

    /*
      Supported response structures.
    */

    const candidates = [
      payload.stocks,
      payload.data,
      payload.quotes,
      payload.results,

      payload.data?.stocks,
      payload.data?.quotes,
      payload.data?.results,

      payload.result?.stocks,
      payload.result?.quotes,
      payload.result?.results
    ];

    for (
      const candidate
      of candidates
    ) {
      if (
        Array.isArray(candidate)
      ) {
        return candidate;
      }
    }

    return [];
  }

  function setMarketDataFromPayload(
    payload
  ) {
    const raw =
      extractMarketArray(
        payload
      );

    const normalized =
      raw
        .map(normalizeStock)
        .filter(isValidStock);

    /*
      Remove duplicate symbols.
    */

    const unique =
      [];

    const seen =
      new Set();

    for (
      const stock
      of normalized
    ) {
      const symbol =
        normalizeSymbol(
          stock.symbol
        );

      if (
        seen.has(symbol)
      ) {
        continue;
      }

      seen.add(symbol);
      unique.push(stock);
    }

    window.MARKET_DATA =
      unique;

    return unique;
  }

  function getStocksFromMarketData() {
    /*
      First try existing MARKET_DATA.
    */

    const existing =
      Array.isArray(
        window.MARKET_DATA
      )
        ? window.MARKET_DATA
        : [];

    const normalized =
      setMarketDataFromPayload(
        existing
      );

    return normalized;
  }

  /* ==========================================================
     DAILY RANKING
  ========================================================== */

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
          ) *
            0.001;

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
            Always 1-based.
          */
          dailyRank:
            index + 1
        })
      );
  }

  /* ==========================================================
     MONTHLY MEMORY
  ========================================================== */

  function normalizeMonthlyRecord(
    record
  ) {
    if (
      !record ||
      typeof record !== "object" ||
      !record.month ||
      !Array.isArray(
        record.symbols
      )
    ) {
      return null;
    }

    const symbols =
      record.symbols
        .map(normalizeSymbol)
        .filter(Boolean);

    /*
      Remove duplicates without
      changing original order.
    */

    const unique =
      [];

    const seen =
      new Set();

    for (
      const symbol
      of symbols
    ) {
      if (
        seen.has(symbol)
      ) {
        continue;
      }

      seen.add(symbol);
      unique.push(symbol);
    }

    if (
      unique.length !==
      TARGET_TOP20
    ) {
      return null;
    }

    return {
      month:
        record.month,

      symbols:
        unique.slice(
          0,
          TARGET_TOP20
        ),

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
      Migrate an existing V12
      current-month snapshot.
    */

    for (
      const key
      of OLD_MONTHLY_KEYS
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
      CRITICAL:
      Current-month snapshot is immutable.
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
        .map(stock =>
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

    if (
      !storageWrite(
        MONTHLY_KEY,
        record
      )
    ) {
      return null;
    }

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

  /* ==========================================================
     MONTHLY STOCKS
  ========================================================== */

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
      new Map();

    ranked.forEach(stock => {
      bySymbol.set(
        normalizeSymbol(
          stock.symbol
        ),
        stock
      );
    });

    return monthlyMemory.symbols
      .map(
        symbol =>
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

  /* ==========================================================
     DAILY MONITORING
  ========================================================== */

  function loadDailyMonitoring() {
    const current =
      storageRead(
        DAILY_KEY
      );

    if (
      current &&
      current.date ===
        todayKey() &&
      current.records &&
      typeof current.records ===
        "object"
    ) {
      return current;
    }

    for (
      const key
      of OLD_DAILY_KEYS
    ) {
      const old =
        storageRead(key);

      if (
        old &&
        old.date ===
          todayKey()
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
      date:
        todayKey(),

      records: {},

      updatedAt:
        new Date().toISOString()
    };
  }

  function buildMonitoring(
    ranked,
    monthlyMemory
  ) {
    const oldMonitoring =
      loadDailyMonitoring();

    const monthlySymbols =
      new Set(
        (
          monthlyMemory?.symbols ||
          []
        ).map(
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
          state =
            "HOLD";

          reason =
            "Monthly Top-20 holding strong hai; daily fluctuation se automatic exit nahi.";
        } else if (
          stock.dailyRank <=
          30
        ) {
          state =
            "WATCH";

          reason =
            "Daily rank Top-20 se bahar hai, lekin automatic exit nahi.";
        } else {
          state =
            "EXIT REVIEW";

          reason =
            "Daily rank 30 se bahar hai; detailed review required.";
        }
      } else {
        if (
          stock.dailyRank <=
          TARGET_TOP20
        ) {
          state =
            "IMPROVING";

          reason =
            "Current daily Top-20 mein improve hua hai; next monthly review candidate.";
        } else {
          state =
            "WATCH";

          reason =
            "Daily rank Top-20 se bahar hai.";
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

    /*
      Keep today's record complete.
    */

    const result = {
      date:
        todayKey(),

      records,

      updatedAt:
        new Date().toISOString(),

      previousUpdatedAt:
        oldMonitoring?.updatedAt ||
        null
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
    const key =
      normalizeSymbol(
        symbol
      );

    return (
      monitoring?.records?.[key] ||
      null
    );
  }

  /* ==========================================================
     EXIT / REPLACEMENT
  ========================================================== */

  function getExitReviewStocks(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(
      stock => {
        const state =
          getMonitoringState(
            monitoring,
            stock.symbol
          );

        return (
          state?.state ===
          "EXIT REVIEW"
        );
      }
    );
  }

  function getFreshInvestmentCandidates(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(
      stock => {
        const state =
          getMonitoringState(
            monitoring,
            stock.symbol
          );

        return (
          state?.state !==
          "EXIT REVIEW"
        );
      }
    );
  }

  function getReplacementCandidates(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthlySymbols =
      new Set(
        (
          monthlyMemory?.symbols ||
          []
        ).map(
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

  /* ==========================================================
     ALLOCATION
  ========================================================== */

  function getStockLimitPercent(
    budget,
    quantity
  ) {
    /*
      Small budget exception:
      first share can use max 25%.
    */

    if (
      budget <
        SMALL_BUDGET_THRESHOLD &&
      quantity === 1
    ) {
      return SMALL_BUDGET_MAX_STOCK;
    }

    return NORMAL_MAX_STOCK;
  }

  function calculateConcentration(
    selected,
    total
  ) {
    const sectors = {};
    const groups = {};

    selected.forEach(stock => {
      const amount =
        safeNumber(
          stock.investment
        );

      const sector =
        stock.sector ||
        "Other";

      const group =
        stock.businessGroup ||
        "Other";

      sectors[sector] =
        (
          sectors[sector] ||
          0
        ) + amount;

      groups[group] =
        (
          groups[group] ||
          0
        ) + amount;
    });

    const sectorPercent = {};
    const groupPercent = {};

    Object.keys(
      sectors
    ).forEach(key => {
      sectorPercent[key] =
        total > 0
          ? sectors[key] / total
          : 0;
    });

    Object.keys(
      groups
    ).forEach(key => {
      groupPercent[key] =
        total > 0
          ? groups[key] / total
          : 0;
    });

    return {
      sectors,
      groups,
      sectorPercent,
      groupPercent
    };
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

    const nextQuantity =
      safeNumber(
        stock.quantity
      ) + 1;

    const nextInvestment =
      nextQuantity *
      stock.price;

    const maxStockPercent =
      Math.min(
        HARD_MAX_STOCK,
        getStockLimitPercent(
          budget,
          nextQuantity
        )
      );

    const maxStockAmount =
      budget *
      maxStockPercent;

    if (
      nextInvestment >
      maxStockAmount +
        0.01
    ) {
      return false;
    }

    const currentSector =
      selected
        .filter(
          s =>
            s.sector ===
            stock.sector
        )
        .reduce(
          (sum, s) =>
            sum +
            safeNumber(
              s.investment
            ),
          0
        );

    const currentGroup =
      selected
        .filter(
          s =>
            s.businessGroup ===
            stock.businessGroup
        )
        .reduce(
          (sum, s) =>
            sum +
            safeNumber(
              s.investment
            ),
          0
        );

    if (
      currentSector +
        stock.price >
      budget *
        MAX_SECTOR_ALLOCATION +
        0.01
    ) {
      return false;
    }

    if (
      currentGroup +
        stock.price >
      budget *
        MAX_GROUP_ALLOCATION +
        0.01
    ) {
      return false;
    }

    return true;
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
      ========================================================
      PASS 1 — DIVERSIFICATION
      ========================================================
    */

    const diversificationCandidates =
      [...candidates]
        .filter(
          stock =>
            stock.price <=
            balance
        )
        .sort(
          (a, b) => {
            const aScore =
              a.rankWeight /
              Math.max(
                1,
                a.price
              );

            const bScore =
              b.rankWeight /
              Math.max(
                1,
                b.price
              );

            return (
              bScore -
              aScore
            );
          }
        );

    const diversificationTarget =
      Math.min(
        MIN_DIVERSIFIED_STOCKS,
        candidates.length
      );

    for (
      const stock
      of diversificationCandidates
    ) {
      if (
        selected.length >=
        diversificationTarget
      ) {
        break;
      }

      if (
        stock.price >
        balance +
          0.000001
      ) {
        continue;
      }

      const simulatedSelected =
        selected.slice();

      /*
        For a new stock, canAddStock
        sees quantity 0 -> 1.
      */

      const testStock = {
        ...stock,

        quantity: 0,

        investment: 0
      };

      if (
        !canAddStock(
          testStock,
          simulatedSelected,
          budget,
          balance
        )
      ) {
        continue;
      }

      stock.quantity = 1;

      stock.investment =
        stock.price;

      selected.push(stock);

      balance -=
        stock.price;
    }

    /*
      ========================================================
      PASS 2 — WHOLE SHARE OPTIMIZATION
      ========================================================
    */

    let guard = 0;

    while (
      balance >
        0.01 &&
      guard <
        20000
    ) {
      guard++;

      let best =
        null;

      let bestScore =
        -Infinity;

      for (
        const candidate
        of candidates
      ) {
        if (
          candidate.price >
          balance +
            0.000001
        ) {
          continue;
        }

        const existingIndex =
          selected.findIndex(
            s =>
              s.symbol ===
              candidate.symbol
          );

        const currentQuantity =
          existingIndex >= 0
            ? safeNumber(
                selected[
                  existingIndex
                ].quantity
              )
            : 0;

        const currentInvestment =
          existingIndex >= 0
            ? safeNumber(
                selected[
                  existingIndex
                ].investment
              )
            : 0;

        /*
          Simulate next share.
        */

        const simulatedStock = {
          ...candidate,

          quantity:
            currentQuantity,

          investment:
            currentInvestment
        };

        const simulatedSelected =
          selected
            .filter(
              s =>
                s.symbol !==
                candidate.symbol
            )
            .map(
              s => ({
                ...s
              })
            );

        if (
          !canAddStock(
            simulatedStock,
            simulatedSelected,
            budget,
            balance
          )
        ) {
          continue;
        }

        const gap =
          Math.max(
            0,
            candidate.targetAmount -
              currentInvestment
          );

        const gapScore =
          budget > 0
            ? gap / budget
            : 0;

        const rankScore =
          candidates.length >
          0
            ? (
                candidates.length -
                candidate.rankIndex
              ) /
              candidates.length
            : 0;

        const existingSectorAmount =
          selected
            .filter(
              s =>
                s.sector ===
                candidate.sector
            )
            .reduce(
              (sum, s) =>
                sum +
                safeNumber(
                  s.investment
                ),
              0
            );

        const existingGroupAmount =
          selected
            .filter(
              s =>
                s.businessGroup ===
                candidate.businessGroup
            )
            .reduce(
              (sum, s) =>
                sum +
                safeNumber(
                  s.investment
                ),
              0
            );

        const sectorCapacity =
          Math.max(
            1,
            budget *
              MAX_SECTOR_ALLOCATION
          );

        const groupCapacity =
          Math.max(
            1,
            budget *
              MAX_GROUP_ALLOCATION
          );

        const sectorDiversification =
          1 -
          Math.min(
            1,
            existingSectorAmount /
              sectorCapacity
          );

        const groupDiversification =
          1 -
          Math.min(
            1,
            existingGroupAmount /
              groupCapacity
          );

        const diversification =
          sectorDiversification +
          groupDiversification;

        const utilization =
          budget > 0
            ? candidate.price /
              budget
            : 0;

        const momentum =
          safeNumber(
            candidate.momentum
          );

        /*
          Allocation score.
          Rank + target gap are primary.
          Diversification is secondary.
        */

        const score =
          gapScore * 5 +
          rankScore * 2.5 +
          diversification *
            1.5 +
          utilization * 1.2 +
          momentum * 0.15;

        if (
          score >
          bestScore
        ) {
          bestScore =
            score;

          best =
            candidate;
        }
      }

      if (!best) {
        break;
      }

      const existingIndex =
        selected.findIndex(
          s =>
            s.symbol ===
            best.symbol
        );

      if (
        existingIndex >= 0
      ) {
        const position =
          selected[
            existingIndex
          ];

        position.quantity +=
          1;

        position.investment =
          position.quantity *
          position.price;

        balance -=
          position.price;
      } else {
        best.quantity = 1;

        best.investment =
          best.price;

        selected.push(best);

        balance -=
          best.price;
      }
    }

    /*
      ========================================================
      FINAL TOTALS
      ========================================================
    */

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

  /* ==========================================================
     FINAL VALIDATION
  ========================================================== */

  function validatePlan(
    plan
  ) {
    if (
      !plan ||
      !Array.isArray(
        plan.selected
      )
    ) {
      throw new Error(
        "Allocation validation failed: invalid plan."
      );
    }

    const budget =
      safeNumber(
        plan.budget
      );

    if (
      budget <= 0
    ) {
      throw new Error(
        "Allocation validation failed: invalid budget."
      );
    }

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
          safeNumber(
            plan.invested
          )
      ) >
      0.01
    ) {
      throw new Error(
        "Allocation validation failed: invested total mismatch."
      );
    }

    if (
      total >
      budget +
        0.01
    ) {
      throw new Error(
        "Allocation validation failed: budget exceeded."
      );
    }

    const sectorTotals = {};
    const groupTotals = {};

    for (
      const stock
      of plan.selected
    ) {
      const quantity =
        safeNumber(
          stock.quantity
        );

      if (
        quantity <= 0
      ) {
        throw new Error(
          `Allocation validation failed: invalid quantity for ${stock.symbol}.`
        );
      }

      const investment =
        safeNumber(
          stock.investment
        );

      if (
        investment <= 0
      ) {
        throw new Error(
          `Allocation validation failed: invalid investment for ${stock.symbol}.`
        );
      }

      const expectedInvestment =
        quantity *
        safeNumber(
          stock.price
        );

      if (
        Math.abs(
          investment -
            expectedInvestment
        ) >
        0.01
      ) {
        throw new Error(
          `Allocation validation failed: share calculation mismatch for ${stock.symbol}.`
        );
      }

      const stockPercent =
        investment /
        budget;

      /*
        Hard 35% limit ALWAYS applies.
      */

      if (
        stockPercent >
        HARD_MAX_STOCK +
          0.000001
      ) {
        throw new Error(
          `Allocation validation failed: ${stock.symbol} exceeds 35% hard limit.`
        );
      }

      const allowed =
        getStockLimitPercent(
          budget,
          quantity
        );

      if (
        stockPercent >
        allowed +
          0.000001
      ) {
        throw new Error(
          `Allocation validation failed: ${stock.symbol} exceeds individual stock limit.`
        );
      }

      const sector =
        stock.sector ||
        "Other";

      const group =
        stock.businessGroup ||
        "Other";

      sectorTotals[sector] =
        (
          sectorTotals[sector] ||
          0
        ) + investment;

      groupTotals[group] =
        (
          groupTotals[group] ||
          0
        ) + investment;
    }

    for (
      const sector
      of Object.keys(
        sectorTotals
      )
    ) {
      if (
        sectorTotals[sector] >
        budget *
          MAX_SECTOR_ALLOCATION +
          0.01
      ) {
        throw new Error(
          `Allocation validation failed: ${sector} sector limit exceeded.`
        );
      }
    }

    for (
      const group
      of Object.keys(
        groupTotals
      )
    ) {
      if (
        groupTotals[group] >
        budget *
          MAX_GROUP_ALLOCATION +
          0.01
      ) {
        throw new Error(
          `Allocation validation failed: ${group} business-group limit exceeded.`
        );
      }
    }

    return true;
  }

  /* ==========================================================
     PORTFOLIO TRACKING
  ========================================================== */

  function savePlanAsTrackedPortfolio(
    plan
  ) {
    const positions =
      plan.selected
        .filter(
          stock =>
            safeNumber(
              stock.quantity
            ) > 0
        )
        .map(
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
          (sum, p) =>
            sum +
            safeNumber(
              p.currentValue
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

  function getTrackedPortfolio() {
    const current =
      storageRead(
        PORTFOLIO_KEY,
        null
      );

    if (current) {
      return current;
    }

    /*
      Read old portfolio only for display.
      It is NOT silently copied into
      the new portfolio.
    */

    for (
      const key
      of OLD_PORTFOLIO_KEYS
    ) {
      const old =
        storageRead(
          key,
          null
        );

      if (old) {
        return old;
      }
    }

    return null;
  }

  function renderTrackedPortfolio() {
    const portfolio =
      getTrackedPortfolio();

    if (
      !portfolio ||
      !Array.isArray(
        portfolio.positions
      ) ||
      !portfolio.positions.length
    ) {
      return `
        <p>
          No active tracked portfolio.
        </p>
      `;
    }

    const invested =
      portfolio.positions.reduce(
        (sum, p) =>
          sum +
          safeNumber(
            p.invested
          ),
        0
      );

    const currentValue =
      portfolio.positions.reduce(
        (sum, p) =>
          sum +
          safeNumber(
            p.currentValue
          ),
        0
      );

    const pnl =
      currentValue -
      invested;

    const pnlPercent =
      invested > 0
        ? (pnl /
            invested) *
          100
        : 0;

    return `
      <div class="portfolio-summary">
        <strong>
          Tracked Invested:
        </strong>
        ${money(invested)}
        <br>

        <strong>
          Current Value:
        </strong>
        ${money(currentValue)}
        <br>

        <strong>
          Current P/L:
        </strong>
        ${pnl >= 0 ? "+" : ""}
        ${money(pnl)}
        (${percent(pnlPercent)})
      </div>
    `;
  }

  /* ==========================================================
     TOP 20 RENDER
  ========================================================== */

  function renderMonthlyTop20(
    ranked
  ) {
    if (!top20List) {
      return;
    }

    const dailyTop20 =
      ranked.slice(
        0,
        TARGET_TOP20
      );

    top20List.innerHTML =
      dailyTop20
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
                  stock.displaySymbol ||
                  stock.symbol
                )}

                • Nifty 50
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

  /* ==========================================================
     WATCHLIST
  ========================================================== */

  function renderWatchlist(
    ranked,
    monthlyMemory
  ) {
    const watchElement =
      document.getElementById(
        "watchlist"
      );

    if (!watchElement) {
      return;
    }

    const monthlySymbols =
      new Set(
        (
          monthlyMemory?.symbols ||
          []
        ).map(
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
            !monthlySymbols.has(
              symbol
            ) &&
            stock.dailyRank >
              TARGET_TOP20
        );
        })
        .slice(0, 3);

    watchElement.innerHTML =
      watch.length
        ? watch
            .map(
              stock => `
                <div>
                  <strong>
                    ${escapeHtml(
                      stock.displaySymbol ||
                      stock.symbol
                    )}
                  </strong>

                  ${escapeHtml(
                    stock.sector
                  )}

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

  /* ==========================================================
     MONITORING UI
  ========================================================== */

  function renderMonitoring(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthlySymbols =
      new Set(
        (
          monthlyMemory?.symbols ||
          []
        ).map(
          normalizeSymbol
        )
      );

    let html =
      `
        <hr>

        <h3>
          📊 Monthly Top-20 Monitoring
        </h3>

        <p>
          Monthly snapshot locked hai.
          Daily ranking sirf monitoring
          ke liye hai.
        </p>
      `;

    ranked.forEach(stock => {
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
        monthlySymbols.has(
          symbol
        ) ||
        state.state ===
          "IMPROVING" ||
        state.state ===
          "EXIT REVIEW";

      if (!relevant) {
        return;
      }

      html += `
        <div class="monitoring-row">

          <strong>
            ${escapeHtml(
              stock.displaySymbol ||
              stock.symbol
            )}
          </strong>

          —
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
    });

    return html;
  }

  /* ==========================================================
     REPLACEMENT UI
  ========================================================== */

  function renderReplacementCandidates(
    candidates,
    exitReviews
  ) {
    let html =
      `
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
          No fresh replacement candidate
          right now.
        </p>
      `;
    } else {
      html +=
        "<ul>";

      candidates.forEach(
        stock => {
          html += `
            <li>
              <strong>
                ${escapeHtml(
                  stock.displaySymbol ||
                  stock.symbol
                )}
              </strong>

              —
              Daily Rank #${
                stock.dailyRank
              }

              —
              IMPROVING
            </li>
          `;
        }
      );

      html +=
        "</ul>";
    }

    if (
      exitReviews.length
    ) {
      html += `
        <p>
          ⚠️
          <strong>
            EXIT REVIEW:
          </strong>

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

  /* ==========================================================
     PLAN UI
  ========================================================== */

  function renderPlan(
    plan,
    decisionStocks
  ) {
    let html = `
      <div>

        <h3>
          🤖 Prototype-1 —
          Monthly Top-20 Smart Investment Plan
        </h3>

        <p>
          Budget:
          <strong>
            ${money(plan.budget)}
          </strong>
        </p>

        <p>
          Decision Mode:
          <strong>
            MONTHLY
          </strong>
        </p>

        <p>
          Daily Monitoring:
          <strong>
            ACTIVE
          </strong>
        </p>

        <p>
          Eligible Monthly Stocks:
          <strong>
            ${decisionStocks.length}
          </strong>
        </p>

        <p>
          Invested:
          <strong>
            ${money(plan.invested)}
          </strong>
        </p>

        <p>
          Balance:
          <strong>
            ${money(plan.balance)}
          </strong>
        </p>

      </div>

      <div style="overflow-x:auto;">

        <table>

          <thead>
            <tr>
              <th>Rank</th>
              <th>Company</th>
              <th>Price</th>
              <th>Target %</th>
              <th>Target ₹</th>
              <th>Shares</th>
              <th>Actual ₹</th>
              <th>Actual %</th>
              <th>Sector</th>
              <th>Group</th>
            </tr>
          </thead>

          <tbody>
    `;

    plan.selected.forEach(
      (stock, index) => {
        const actualPercent =
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
                  stock.displaySymbol ||
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
              ${percent(
                stock.targetPercent *
                  100
              )}
            </td>

            <td>
              ${money(
                stock.targetAmount
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
                actualPercent
              )}
            </td>

            <td>
              ${escapeHtml(
                stock.sector
              )}
            </td>

            <td>
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

      <hr>

      <h3>
        📌 Selected Stocks
      </h3>

      <ul>
    `;

    plan.selected
      .filter(
        stock =>
          stock.quantity >
          0
      )
      .forEach(stock => {
        html += `
          <li>
            <strong>
              ${escapeHtml(
                stock.symbol
              )}
            </strong>

            —
            ${stock.quantity}
            share(s)

            —
            ${money(
              stock.investment
            )}
          </li>
        `;
      });

    html += `
      </ul>

      <hr>

      <h3>
        🧠 Decision Logic
      </h3>

      <ul>

        <li>
          Monthly Top-20 primary
          investment decision hai.
        </li>

        <li>
          Daily ranking monitoring
          signal hai.
        </li>

        <li>
          Daily fluctuation se
          automatic BUY/SELL nahi.
        </li>

        <li>
          Current-month snapshot
          daily ranking se overwrite
          nahi hota.
        </li>

        <li>
          Daily rank 30 se bahar
          hone par EXIT REVIEW.
        </li>

        <li>
          EXIT REVIEW stock fresh
          allocation mein nahi aata.
        </li>

        <li>
          Improving stock next
          monthly review candidate hai.
        </li>

        <li>
          Whole-share allocation.
        </li>

        <li>
          Normal stock limit:
          <strong>
            20%
          </strong>
        </li>

        <li>
          Small budget first-share:
          <strong>
            25%
          </strong>
        </li>

        <li>
          Hard maximum:
          <strong>
            35%
          </strong>
        </li>

        <li>
          Sector maximum:
          <strong>
            40%
          </strong>
        </li>

        <li>
          Business group maximum:
          <strong>
            30%
          </strong>
        </li>

        <li>
          Budget exceed nahi hoga.
        </li>

        <li>
          Final validation allocation
          ko dobara verify karti hai.
        </li>

      </ul>

      <hr>

      <h3>
        📊 Final Summary
      </h3>

      <p>
        Budget:
        <strong>
          ${money(plan.budget)}
        </strong>
      </p>

      <p>
        Invested:
        <strong>
          ${money(plan.invested)}
        </strong>
      </p>

      <p>
        Balance:
        <strong>
          ${money(plan.balance)}
        </strong>
      </p>

      <p>
        Selected:
        <strong>
          ${plan.selectedCount}
        </strong>
        stocks
      </p>

      <hr>

      <h3>
        💰 Investment Tracking
      </h3>

      ${renderTrackedPortfolio()}
    `;

    return html;
  }

  /* ==========================================================
     COMPLETE ANALYSIS
  ========================================================== */

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
        `Live market data incomplete hai. ${stocks.length}/${TARGET_TOP20} valid stocks received.`
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
        "Monthly Top-20 snapshot create nahi ho paya."
      );
    }

    const monitoring =
      buildMonitoring(
        ranked,
        monthlyMemory
      );

    renderMonthlyTop20(
      ranked
    );

    renderWatchlist(
      ranked,
      monthlyMemory
    );

    const monthlyList =
      getMonthlyStocks(
        ranked,
        monthlyMemory
      );

    if (
      !monthlyList.length
    ) {
      throw new Error(
        "Current monthly Top-20 stocks live market data mein available nahi hain."
      );
    }

    const exitReviews =
      getExitReviewStocks(
        monthlyList,
        monitoring
      );

    const decisionStocks =
      getFreshInvestmentCandidates(
        monthlyList,
        monitoring
      );

    const replacementCandidates =
      getReplacementCandidates(
        ranked,
        monthlyMemory,
        monitoring
      );

    if (
      !decisionStocks.length
    ) {
      throw new Error(
        "Current monthly Top-20 ke saare eligible stocks EXIT REVIEW mein hain. Fresh investment plan generate nahi kiya gaya."
      );
    }

    const plan =
      buildSmartPlan(
        decisionStocks,
        budget
      );

    if (
      !plan.selectedCount
    ) {
      throw new Error(
        "Is investment amount par whole-share allocation se koi valid stock allocate nahi ho paya."
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
          replacementCandidates,
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
      monthlyList,
      exitReviews,
      replacementCandidates,
      decisionStocks,
      plan
    };
  }

  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;

  /* ==========================================================
     CONNECT LIVE MARKET DATA
     ========================================================== */

  if (connectButton) {
    connectButton.addEventListener(
      "click",
      async () => {
        try {
          const totp =
            String(
              totpInput?.value ||
              ""
            ).trim();

          if (
            !/^\d{6}$/.test(
              totp
            )
          ) {
            alert(
              "Please current 6-digit Kotak Neo TOTP enter karein."
            );

            return;
          }

          if (
            typeof window.fetchMarketData !==
            "function"
          ) {
            alert(
              "Market data engine load nahi hua. Page refresh karke dobara try karein."
            );

            return;
          }

          connectButton.disabled =
            true;

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div>
                🔄
                Live market data fetch ho raha hai...
              </div>
            `;
          }

          /*
            IMPORTANT:
            Existing quotes.js flow is called
            exactly through fetchMarketData(totp).
          */

          const response =
            await window.fetchMarketData(
              totp
            );

          /*
            This is the critical V13.1 fix:
            handle BOTH array and object response.
          */

          const stocks =
            setMarketDataFromPayload(
              response
            );

          /*
            If fetchMarketData itself has
            already populated MARKET_DATA,
            use that as fallback.
          */

          let finalStocks =
            stocks;

          if (
            finalStocks.length <
            TARGET_TOP20
          ) {
            const fallback =
              getStocksFromMarketData();

            if (
              fallback.length >
              finalStocks.length
            ) {
              finalStocks =
                fallback;
            }
          }

          if (
            finalStocks.length <
            TARGET_TOP20
          ) {
            /*
              Give a useful diagnostic
              instead of falsely saying
              "0 stocks" when response existed.
            */

            const rawCount =
              extractMarketArray(
                response
              ).length;

            throw new Error(
              `Live response mila, lekin frontend mein ${finalStocks.length} valid stocks map hue. Raw records: ${rawCount}.`
            );
          }

          const ranked =
            smartRankStocks(
              finalStocks
            );

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

          renderMonthlyTop20(
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
              `Live market data connected successfully. ${finalStocks.length}/50 stocks received.`;
          }

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div>

                <strong>
                  Live Market Data Connected ✅
                </strong>

                <br><br>

                <strong>
                  ${finalStocks.length}/50
                </strong>
                Nifty 50 stocks received.

                <br><br>

                Market:
                <strong>
                  LIVE
                </strong>

                <br>

                Monthly Snapshot:
                <strong>
                  ${escapeHtml(
                    monthlyMemory.month
                  )}
                </strong>

                <br>

                Daily Monitoring:
                <strong>
                  ACTIVE
                </strong>

                <br>

                Monthly Decision Mode:
                <strong>
                  ACTIVE
                </strong>

              </div>

              ${renderMonitoring(
                ranked,
                monthlyMemory,
                monitoring
              )}
            `;
          }

        } catch (
          error
        ) {
          console.error(
            "Prototype-1 live connection error:",
            error
          );

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div>

                <strong>
                  ⚠️ Live Market Data Error
                </strong>

                <br><br>

                ${escapeHtml(
                  error?.message ||
                  "Live market data connect nahi ho paya."
                )}

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

  /* ==========================================================
     ANALYZE BUTTON
  ========================================================== */

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

        } catch (
          error
        ) {
          console.error(
            "Prototype-1 analysis error:",
            error
          );

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div>

                <strong>
                  ⚠️ Analysis Error
                </strong>

                <br><br>

                ${escapeHtml(
                  error?.message ||
                  "Investment analysis failed."
                )}

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

  /* ==========================================================
     INITIAL RENDER
  ========================================================== */

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

      if (
        monthlyMemory
      ) {
        const monitoring =
          buildMonitoring(
            ranked,
            monthlyMemory
          );

        renderMonthlyTop20(
          ranked
        );

        renderWatchlist(
          ranked,
          monthlyMemory
        );

        /*
          Do NOT automatically generate
          an investment plan here.
        */
        void monitoring;
      }
    }
  } catch (
    error
  ) {
    console.warn(
      "Initial Prototype-1 render skipped:",
      error
    );
  }

  /* ==========================================================
     DEBUG / VERIFICATION HELPERS
  ========================================================== */

  window.Prototype1Debug = {
    version:
      "V13.1",

    getMarketData() {
      return (
        Array.isArray(
          window.MARKET_DATA
        )
          ? window.MARKET_DATA
          : []
      );
    },

    getMonthlyMemory() {
      return getSavedMonthlyMemory();
    },

    getDailyMonitoring() {
      return storageRead(
        DAILY_KEY,
        null
      );
    },

    getPortfolio() {
      return getTrackedPortfolio();
    },

    rank() {
      return smartRankStocks(
        getStocksFromMarketData()
      );
    },

    validateCurrentPlan(plan) {
      return validatePlan(
        plan
      );
    }
  };

  console.log(
    "Prototype-1 App Engine V13.1 loaded successfully."
  );

})();
