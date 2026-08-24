/* ============================================================
   PROTOTYPE-1 — APP ENGINE V7
   Monthly Top-20 + Daily Monitoring + Smart Whole-Share Plan
   ============================================================ */

(() => {
  "use strict";

  /* =========================
     CONFIG
  ========================= */

  const TARGET_TOP20 = 20;

  const NORMAL_MAX_STOCK = 0.20;
  const SMALL_BUDGET_MAX_STOCK = 0.25;
  const HARD_MAX_STOCK = 0.35;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const MIN_DIVERSIFIED_STOCKS = 5;

  const PORTFOLIO_KEY = "prototype1_portfolio_v7";
  const MONTHLY_KEY = "prototype1_monthly_top20_v7";
  const DAILY_KEY = "prototype1_daily_monitoring_v7";

  /* Existing V5/V6 keys are read for migration */
  const OLD_PORTFOLIO_KEYS = [
    "prototype1_portfolio_v6",
    "prototype1_portfolio_v5"
  ];

  const OLD_MONTHLY_KEYS = [
    "prototype1_monthly_top20_v6",
    "prototype1_monthly_top20_v5"
  ];

  const OLD_DAILY_KEYS = [
    "prototype1_daily_monitoring_v6",
    "prototype1_daily_monitoring_v5"
  ];

  /* =========================
     DOM
  ========================= */

  const amountInput = document.getElementById("amount");
  const totpInput = document.getElementById("totp");

  const connectButton = document.getElementById("connectButton");
  const analyzeButton = document.getElementById("analyzeButton");

  const recommendation = document.getElementById("recommendation");
  const top20List = document.getElementById("top20List");

  /* =========================
     BASIC HELPERS
  ========================= */

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function money(value) {
    return "₹" + safeNumber(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function percent(value) {
    return safeNumber(value).toFixed(2) + "%";
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function todayKey() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function normalizeSymbol(symbol) {
    return String(symbol || "")
      .toUpperCase()
      .replace(/-EQ$/i, "")
      .trim();
  }

  function storageRead(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function storageWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /* =========================
     NIFTY MASTER LOOKUP
  ========================= */

  function findNiftyStock(symbol) {
    const target = normalizeSymbol(symbol);

    const master = Array.isArray(window.NIFTY_50_STOCKS)
      ? window.NIFTY_50_STOCKS
      : [];

    return master.find(item =>
      normalizeSymbol(
        item.symbol ||
        item.tradingsymbol ||
        item.ticker
      ) === target
    ) || null;
  }

  function inferBusinessGroup(symbol) {
    const s = normalizeSymbol(symbol);

    const groups = {
      HDFCBANK: "HDFC Group",
      HDFCLIFE: "HDFC Group",

      ICICIBANK: "ICICI Group",
      ICICIPRULI: "ICICI Group",

      BAJAJ-AUTO: "Bajaj Group",
      BAJAJFINSV: "Bajaj Group",
      BAJFINANCE: "Bajaj Group",

      RELIANCE: "Reliance Group",

      TATAMOTORS: "Tata Group",
      TATASTEEL: "Tata Group",
      TATACONSUM: "Tata Group",
      TCS: "Tata Group",
      TITAN: "Tata Group",
      TRENT: "Tata Group",

      SBIN: "SBI Group",
      SBILIFE: "SBI Group",

      ADANIENT: "Adani Group",
      ADANIPORTS: "Adani Group",

      LT: "Larsen Group",
      LTIM: "Larsen Group",
      LTTS: "Larsen Group"
    };

    return groups[s] || s;
  }

  /* =========================
     NORMALIZATION
  ========================= */

  function normalizeStock(stock) {
    const symbol = normalizeSymbol(
      stock.symbol ||
      stock.tradingsymbol ||
      stock.ticker
    );

    const master = findNiftyStock(symbol);

    return {
      ...stock,

      symbol,
      name:
        stock.name ||
        stock.companyName ||
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

      price: safeNumber(
        stock.price ??
        stock.lastPrice ??
        stock.ltp
      ),

      change: safeNumber(
        stock.change ??
        stock.changePercent ??
        stock.pChange
      ),

      chartScore: safeNumber(stock.chartScore),
      fundamentalScore: safeNumber(stock.fundamentalScore),
      newsScore: safeNumber(stock.newsScore),

      priority: safeNumber(
        stock.priority ??
        master?.priority
      )
    };
  }

  function isValidStock(stock) {
    return Boolean(
      stock &&
      stock.symbol &&
      Number.isFinite(stock.price) &&
      stock.price > 0 &&
      Number.isFinite(stock.change)
    );
  }

  /* =========================
     LIVE MARKET DATA
     IMPORTANT:
     Existing quotes.js flow is untouched.
  ========================= */

  function getStocksFromMarketData() {
    const data = Array.isArray(window.MARKET_DATA)
      ? window.MARKET_DATA
      : [];

    return data
      .map(normalizeStock)
      .filter(isValidStock);
  }

  /* =========================
     RANKING ENGINE
  ========================= */

  function smartRankStocks(stocks) {
    return stocks
      .map(stock => {
        const momentum = Math.max(
          -5,
          Math.min(5, safeNumber(stock.chartScore))
        );

        const engineScore =
          safeNumber(stock.change) +
          momentum * 0.10 +
          safeNumber(stock.priority) * 0.001;

        return {
          ...stock,
          momentum,
          engineScore
        };
      })
      .sort((a, b) =>
        b.engineScore - a.engineScore
      )
      .map((stock, index) => ({
        ...stock,
        dailyRank: index + 1
      }));
  }

  /* =========================
     MONTHLY MEMORY
  ========================= */

  function getSavedMonthlyMemory() {
    const currentMonth = currentMonthKey();

    let saved = storageRead(MONTHLY_KEY);

    if (
      saved &&
      saved.month === currentMonth &&
      Array.isArray(saved.symbols) &&
      saved.symbols.length === TARGET_TOP20
    ) {
      return saved;
    }

    /*
      Migration:
      Read previous V5/V6 monthly snapshot once.
    */

    for (const key of OLD_MONTHLY_KEYS) {
      const old = storageRead(key);

      if (
        old &&
        old.month === currentMonth &&
        Array.isArray(old.symbols) &&
        old.symbols.length === TARGET_TOP20
      ) {
        const migrated = {
          month: currentMonth,
          symbols: old.symbols
            .map(normalizeSymbol)
            .slice(0, TARGET_TOP20),
          createdAt: old.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "migrated"
        };

        storageWrite(MONTHLY_KEY, migrated);
        return migrated;
      }
    }

    return null;
  }

  function saveMonthlyTop20(top20, reason = "monthly_initialization") {
    const currentMonth = currentMonthKey();

    const symbols = top20
      .slice(0, TARGET_TOP20)
      .map(s => normalizeSymbol(s.symbol));

    const existing = getSavedMonthlyMemory();

    /*
      CRITICAL RULE:
      Once a monthly snapshot exists, daily ranking MUST NOT
      overwrite it.
    */

    if (
      existing &&
      existing.month === currentMonth &&
      existing.symbols.length === TARGET_TOP20
    ) {
      return existing;
    }

    const record = {
      month: currentMonth,
      symbols,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: reason
    };

    storageWrite(MONTHLY_KEY, record);

    return record;
  }

  function ensureMonthlyTop20(ranked) {
    let monthly = getSavedMonthlyMemory();

    if (monthly) {
      return monthly;
    }

    /*
      First analysis of a new month:
      create monthly snapshot from that month's ranking.
    */

    const initialTop20 = ranked.slice(0, TARGET_TOP20);

    return saveMonthlyTop20(
      initialTop20,
      "new_month_snapshot"
    );
  }

  function monthlyStocks(ranked) {
    const memory = ensureMonthlyTop20(ranked);

    const bySymbol = new Map(
      ranked.map(stock => [
        normalizeSymbol(stock.symbol),
        stock
      ])
    );

    return memory.symbols
      .map(symbol => bySymbol.get(normalizeSymbol(symbol)))
      .filter(Boolean)
      .map((stock, index) => ({
        ...stock,
        monthlyRank: index + 1
      }));
  }

  /* =========================
     DAILY MONITORING
  ========================= */

  function loadDailyMonitoring() {
    return storageRead(DAILY_KEY, {
      date: todayKey(),
      records: {}
    });
  }

  function saveDailyMonitoring(data) {
    storageWrite(DAILY_KEY, data);
  }

  function getMonitoringState(stock, monthlySymbols) {
    const symbol = normalizeSymbol(stock.symbol);
    const inMonthly = monthlySymbols.includes(symbol);

    if (inMonthly) {
      if (stock.dailyRank <= TARGET_TOP20) {
        return {
          state: "HOLD",
          reason:
            "Monthly Top-20 mein hai; daily fluctuation normal hai."
        };
      }

      if (stock.dailyRank <= 30) {
        return {
          state: "WATCH",
          reason:
            "Monthly Top-20 mein hai lekin daily ranking weaken hui hai; automatic exit nahi."
        };
      }

      return {
        state: "EXIT REVIEW",
        reason:
          "Monthly Top-20 holding ki daily ranking significantly deteriorate hui hai; detailed review required."
      };
    }

    /*
      Not in monthly snapshot.
      Daily improvement NEVER changes monthly investment decision.
    */

    if (stock.dailyRank <= TARGET_TOP20) {
      return {
        state: "IMPROVING",
        reason:
          "Stock current daily Top-20 mein aa gaya hai; next monthly review mein consider kiya jayega."
      };
    }

    if (stock.dailyRank <= 30) {
      return {
        state: "WATCH",
        reason:
          "Daily ranking Top-20 se bahar hai; monthly investment decision automatically change nahi hoga."
      };
    }

    return {
      state: "WATCH",
      reason:
        "Daily ranking weak hai; monthly investment decision automatically change nahi hoga."
    };
  }

  function buildMonitoring(ranked, monthlyMemory) {
    const monthlySymbols =
      monthlyMemory.symbols.map(normalizeSymbol);

    const records = {};

    ranked.forEach(stock => {
      const signal = getMonitoringState(
        stock,
        monthlySymbols
      );

      records[normalizeSymbol(stock.symbol)] = {
        symbol: normalizeSymbol(stock.symbol),
        dailyRank: stock.dailyRank,
        monthlyRank:
          monthlySymbols.indexOf(
            normalizeSymbol(stock.symbol)
          ) + 1,
        state: signal.state,
        reason: signal.reason,
        date: todayKey(),
        updatedAt: new Date().toISOString()
      };
    });

    const data = {
      date: todayKey(),
      month: monthlyMemory.month,
      records
    };

    saveDailyMonitoring(data);

    return data;
  }

  /* =========================
     EXIT REVIEW FILTER
  ========================= */

  function getFreshInvestmentCandidates(
    monthlyStocksList,
    monitoring
  ) {
    return monthlyStocksList.filter(stock => {
      const symbol = normalizeSymbol(stock.symbol);
      const monitor = monitoring.records[symbol];

      /*
        CRITICAL FIX:
        EXIT REVIEW stocks must not receive a fresh BUY
        allocation in the same generated plan.
      */

      if (
        monitor &&
        monitor.state === "EXIT REVIEW"
      ) {
        return false;
      }

      return true;
    });
  }

  /* =========================
     WHOLE SHARE ALLOCATION
  ========================= */

  function calculateTargetWeights(stocks) {
    const count = stocks.length;

    if (!count) return [];

    const totalWeight =
      (count * (count + 1)) / 2;

    return stocks.map((stock, index) => {
      const rankWeight = count - index;

      return {
        ...stock,
        rankWeight,
        targetPercent:
          rankWeight / totalWeight
      };
    });
  }

  function sectorTotal(selected, sector) {
    return selected
      .filter(s => s.sector === sector)
      .reduce(
        (sum, s) => sum + s.investment,
        0
      );
  }

  function groupTotal(selected, group) {
    return selected
      .filter(s => s.businessGroup === group)
      .reduce(
        (sum, s) => sum + s.investment,
        0
      );
  }

  function canAdd(
    stock,
    selected,
    budget,
    balance
  ) {
    if (stock.price > balance) {
      return false;
    }

    const currentInvestment =
      selected.find(
        s => s.symbol === stock.symbol
      )?.investment || 0;

    const stockLimit =
      currentInvestment === 0 &&
      stock.price <=
        budget * SMALL_BUDGET_MAX_STOCK
        ? SMALL_BUDGET_MAX_STOCK
        : NORMAL_MAX_STOCK;

    const maxStock =
      Math.min(
        HARD_MAX_STOCK,
        stockLimit
      ) * budget;

    if (
      currentInvestment + stock.price >
      maxStock + 0.0001
    ) {
      return false;
    }

    const sectorLimit =
      budget * MAX_SECTOR_ALLOCATION;

    if (
      sectorTotal(
        selected,
        stock.sector
      ) + stock.price >
      sectorLimit + 0.0001
    ) {
      return false;
    }

    const groupLimit =
      budget * MAX_GROUP_ALLOCATION;

    if (
      groupTotal(
        selected,
        stock.businessGroup
      ) + stock.price >
      groupLimit + 0.0001
    ) {
      return false;
    }

    return true;
  }

  function allocationScore(
    stock,
    selected,
    budget,
    balance
  ) {
    const existing =
      selected.find(
        s => s.symbol === stock.symbol
      );

    const current =
      existing?.investment || 0;

    const target =
      stock.targetPercent * budget;

    const gapScore =
      Math.max(
        0,
        target - current
      ) / budget;

    const rankScore =
      (TARGET_TOP20 - stock.monthlyRank + 1) /
      TARGET_TOP20;

    const sectorInvestment =
      sectorTotal(
        selected,
        stock.sector
      );

    const diversification =
      1 -
      Math.min(
        1,
        sectorInvestment /
          (budget * MAX_SECTOR_ALLOCATION)
      );

    const utilization =
      Math.min(
        1,
        stock.price / Math.max(balance, 1)
      );

    const momentum =
      Math.max(
        -5,
        Math.min(5, stock.momentum || 0)
      );

    return (
      gapScore * 5 +
      rankScore * 2.5 +
      diversification * 1.5 +
      utilization * 1.2 +
      momentum * 0.15
    );
  }

  function buildSmartPlan(
    stocks,
    budget
  ) {
    const weighted =
      calculateTargetWeights(stocks);

    const selected = weighted.map(stock => ({
      ...stock,
      quantity: 0,
      investment: 0
    }));

    let balance = budget;

    /*
      PASS 1:
      Try to create at least MIN_DIVERSIFIED_STOCKS.
    */

    const affordable = [...selected]
      .filter(s => s.price <= budget)
      .sort(
        (a, b) =>
          (b.rankWeight / b.price) -
          (a.rankWeight / a.price)
      );

    for (
      const stock of affordable
    ) {
      if (
        countSelected(selected) >=
        Math.min(
          MIN_DIVERSIFIED_STOCKS,
          selected.length
        )
      ) {
        break;
      }

      if (
        canAdd(
          stock,
          selected,
          budget,
          balance
        )
      ) {
        stock.quantity += 1;
        stock.investment =
          stock.quantity * stock.price;

        balance -= stock.price;
      }
    }

    /*
      PASS 2:
      Smart whole-share allocation.
    */

    let guard = 0;

    while (
      balance > 0 &&
      guard < 20000
    ) {
      guard++;

      const possible =
        selected.filter(stock =>
          canAdd(
            stock,
            selected,
            budget,
            balance
          )
        );

      if (!possible.length) {
        break;
      }

      possible.sort(
        (a, b) =>
          allocationScore(
            b,
            selected,
            budget,
            balance
          ) -
          allocationScore(
            a,
            selected,
            budget,
            balance
          )
      );

      const best = possible[0];

      best.quantity += 1;
      best.investment =
        best.quantity * best.price;

      balance -= best.price;
    }

    const invested =
      budget - balance;

    return {
      budget,
      invested,
      balance,
      selected,
      selectedCount:
        countSelected(selected)
    };
  }

  function countSelected(stocks) {
    return stocks.filter(
      s => s.quantity > 0
    ).length;
  }

  /* =========================
     CONCENTRATION
  ========================= */

  function calculateConcentration(
    stocks,
    total
  ) {
    const sector = {};
    const group = {};

    stocks.forEach(stock => {
      if (stock.quantity <= 0) return;

      sector[stock.sector] =
        (sector[stock.sector] || 0) +
        stock.investment;

      group[stock.businessGroup] =
        (group[stock.businessGroup] || 0) +
        stock.investment;
    });

    return {
      sector: Object.fromEntries(
        Object.entries(sector).map(
          ([key, value]) => [
            key,
            total > 0
              ? value / total
              : 0
          ]
        )
      ),

      group: Object.fromEntries(
        Object.entries(group).map(
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

  /* =========================
     RENDER TOP 20
  ========================= */

  function renderTop20(ranked) {
    if (!top20List) return;

    const top20 =
      ranked.slice(
        0,
        TARGET_TOP20
      );

    top20List.innerHTML =
      top20.map(
        (stock, index) => `
          <div class="top20-item">
            <div>
              <strong>${index + 1}</strong>
              ${escapeHtml(stock.name)}
            </div>

            <div>
              ${escapeHtml(stock.symbol)}
              • Nifty 50
            </div>

            <div>
              ${stock.change >= 0 ? "+" : ""}
              ${percent(stock.change)}
              • ${money(stock.price)}
            </div>
          </div>
        `
      ).join("");
  }

  /* =========================
     WATCHLIST
  ========================= */

  function renderWatchlist(ranked) {
    const watchCandidates =
      ranked
        .filter(
          s => s.dailyRank > TARGET_TOP20
        )
        .slice(0, 3);

    const element =
      document.getElementById(
        "watchlist"
      );

    if (!element) return;

    element.innerHTML =
      watchCandidates.map(
        stock => `
          <div>
            <strong>
              ${escapeHtml(stock.name)}
            </strong>
            <span>
              ${escapeHtml(stock.sector)}
            </span>
            <b>WATCH</b>
          </div>
        `
      ).join("");
  }

  /* =========================
     MONITORING HTML
  ========================= */

  function renderMonitoring(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthlySymbols =
      monthlyMemory.symbols.map(
        normalizeSymbol
      );

    let html = `
      <h3>📊 Monthly Top-20 Monitoring</h3>
      <p>
        Daily monitoring active hai.
        Monthly investment decision daily
        fluctuation se automatically change nahi hoga.
      </p>
    `;

    ranked.forEach(stock => {
      const symbol =
        normalizeSymbol(stock.symbol);

      const record =
        monitoring.records[symbol];

      if (!record) return;

      html += `
        <div class="monitor-row">
          <strong>${escapeHtml(symbol)}</strong>
          — Daily Rank #${stock.dailyRank}
          —
          <b>${escapeHtml(record.state)}</b>
          <br>
          <small>
            ${escapeHtml(record.reason)}
          </small>
        </div>
      `;
    });

    return html;
  }

  /* =========================
     PLAN HTML
  ========================= */

  function renderPlan(
    plan,
    monthlyStocksList,
    monitoring
  ) {
    const concentrations =
      calculateConcentration(
        plan.selected,
        plan.invested
      );

    let html = `
      <h3>🤖 Prototype-1 V7</h3>

      <h4>
        Monthly Top-20 Smart Investment Plan
      </h4>

      <p>
        Budget:
        <strong>${money(plan.budget)}</strong>
      </p>

      <p>
        Decision Mode:
        <strong>MONTHLY</strong>
      </p>

      <p>
        Daily Monitoring:
        <strong>ACTIVE</strong>
      </p>

      <p>
        Monthly Decision Stocks:
        <strong>${monthlyStocksList.length}</strong>
      </p>

      <p>
        Invested:
        <strong>${money(plan.invested)}</strong>
      </p>

      <p>
        Balance:
        <strong>${money(plan.balance)}</strong>
      </p>

      <hr>

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
          plan.invested > 0
            ? stock.investment /
              plan.invested *
              100
            : 0;

        html += `
          <tr>
            <td>${index + 1}</td>

            <td>
              <strong>
                ${escapeHtml(
                  stock.symbol
                )}-EQ
              </strong>
              <br>
              ${escapeHtml(stock.name)}
            </td>

            <td>${money(stock.price)}</td>

            <td>
              ${percent(
                stock.targetPercent * 100
              )}
            </td>

            <td>
              ${money(
                stock.targetPercent *
                plan.budget
              )}
            </td>

            <td>
              <strong>
                ${stock.quantity}
              </strong>
            </td>

            <td>
              ${money(stock.investment)}
            </td>

            <td>
              ${percent(actualPercent)}
            </td>

            <td>
              ${escapeHtml(stock.sector)}
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

      <hr>

      <h3>📌 Selected Stocks</h3>
      <ul>
    `;

    plan.selected
      .filter(s => s.quantity > 0)
      .forEach(stock => {
        html += `
          <li>
            <strong>
              ${escapeHtml(stock.symbol)}
            </strong>
            —
            ${stock.quantity} share(s)
            —
            ${money(stock.investment)}
          </li>
        `;
      });

    html += `
      </ul>

      <hr>

      <h3>🧠 V7 Decision Logic</h3>

      <ul>
        <li>
          Monthly Top-20 investment decision ka
          primary reference hai.
        </li>

        <li>
          Daily ranking sirf monitoring signal hai.
        </li>

        <li>
          Daily fluctuation se automatic BUY/SELL nahi hoga.
        </li>

        <li>
          Existing monthly memory ko daily ranking
          overwrite nahi karegi.
        </li>

        <li>
          Monthly Top-20 holding ke strong deterioration
          par EXIT REVIEW milega.
        </li>

        <li>
          EXIT REVIEW stock ko same fresh investment
          plan mein allocate nahi kiya jayega.
        </li>

        <li>
          Daily Top-20 mein improve hua stock
          next monthly review ke liye candidate rahega.
        </li>

        <li>
          Daily improvement current monthly investment
          decision ko immediately replace nahi karega.
        </li>

        <li>
          Whole-share allocation use hota hai.
        </li>

        <li>
          Normal individual-stock limit 20% hai.
        </li>

        <li>
          Small-budget first-share limit 25% hai.
        </li>

        <li>
          Hard stock limit 35% hai.
        </li>

        <li>
          Sector limit 40% hai.
        </li>

        <li>
          Business-group limit 30% hai.
        </li>

        <li>
          Budget kabhi exceed nahi hoga.
        </li>

        <li>
          Fake research score generate nahi kiya jayega.
        </li>

        <li>
          Sirf available live market data use hoga.
        </li>
      </ul>

      <hr>

      <h3>📊 Allocation Summary</h3>

      <p>
        Selected:
        <strong>${plan.selectedCount}</strong>
        stocks
      </p>

      <p>
        Invested:
        <strong>${money(plan.invested)}</strong>
      </p>

      <p>
        Balance:
        <strong>${money(plan.balance)}</strong>
      </p>
    `;

    return html;
  }

  /* =========================
     ANALYZE INVESTMENT
  ========================= */

  async function analyzeInvestmentAmount(
    amount
  ) {
    const budget =
      safeNumber(amount);

    if (
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      throw new Error(
        "Please valid investment amount enter karein."
      );
    }

    const stocks =
      getStocksFromMarketData();

    if (stocks.length < TARGET_TOP20) {
      throw new Error(
        `Live market data incomplete hai. ${TARGET_TOP20} se kam valid stocks mile.`
      );
    }

    /*
      DAILY ranking.
      This is NEVER directly used as the
      monthly investment source once monthly
      memory exists.
    */

    const ranked =
      smartRankStocks(stocks);

    renderTop20(ranked);
    renderWatchlist(ranked);

    /*
      MONTHLY SNAPSHOT
    */

    const monthlyMemory =
      ensureMonthlyTop20(ranked);

    /*
      Daily monitoring
    */

    const monitoring =
      buildMonitoring(
        ranked,
        monthlyMemory
      );

    /*
      MONTHLY stocks only
    */

    const monthlyList =
      monthlyStocks(ranked);

    /*
      IMPORTANT:
      Remove EXIT REVIEW stocks from NEW plan.
    */

    const decisionStocks =
      getFreshInvestmentCandidates(
        monthlyList,
        monitoring
      );

    /*
      Safety:
      Never use daily Top-20 as replacement
      merely because it ranks higher today.
    */

    if (!decisionStocks.length) {
      throw new Error(
        "Monthly Top-20 mein fresh investment ke liye valid candidates available nahi hain."
      );
    }

    const plan =
      buildSmartPlan(
        decisionStocks,
        budget
      );

    /*
      Portfolio tracking is deliberately kept
      separate from this new investment plan.
    */

    const output =
      renderPlan(
        plan,
        decisionStocks,
        monitoring
      );

    const monitoringHtml =
      renderMonitoring(
        ranked,
        monthlyMemory,
        monitoring
      );

    if (recommendation) {
      recommendation.innerHTML =
        output +
        "<hr>" +
        monitoringHtml;
    }

    return {
      ranked,
      monthlyMemory,
      monitoring,
      decisionStocks,
      plan
    };
  }

  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;

  /* =========================
     CONNECT LIVE MARKET DATA
  ========================= */

  if (connectButton) {
    connectButton.addEventListener(
      "click",
      async () => {
        try {
          const totp =
            String(
              totpInput?.value || ""
            ).trim();

          if (!/^\d{6}$/.test(totp)) {
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

          connectButton.disabled = true;

          /*
            EXISTING QUOTES.JS FLOW.
            DO NOT MODIFY.
          */

          const result =
            await window.fetchMarketData(
              totp
            );

          /*
            Some quotes.js implementations return
            data, while others populate window.MARKET_DATA.
            Support both without changing the flow.
          */

          if (
            Array.isArray(result) &&
            result.length
          ) {
            window.MARKET_DATA = result;
          }

          const stocks =
            getStocksFromMarketData();

          if (
            stocks.length < TARGET_TOP20
          ) {
            throw new Error(
              `Live market data incomplete hai. ${stocks.length}/${TARGET_TOP20} valid stocks received.`
            );
          }

          const ranked =
            smartRankStocks(stocks);

          renderTop20(ranked);
          renderWatchlist(ranked);

          const monthlyMemory =
            ensureMonthlyTop20(
              ranked
            );

          buildMonitoring(
            ranked,
            monthlyMemory
          );

          const status =
            document.getElementById(
              "marketStatus"
            );

          if (status) {
            status.textContent =
              `Live market data connected successfully. ${stocks.length}/${stocks.length} stocks received.`;
          }

          if (
            recommendation &&
            !recommendation.innerHTML.trim()
          ) {
            recommendation.innerHTML = `
              <div>
                <strong>
                  Live Market Data Connected ✅
                </strong>
                <br>
                ${stocks.length}/${stocks.length}
                valid stocks received.
                <br><br>
                Monthly Top-20 memory:
                <strong>
                  ${monthlyMemory.month}
                </strong>
                <br>
                Daily Monitoring:
                <strong>ACTIVE</strong>
              </div>
            `;
          }

        } catch (error) {
          console.error(
            "Prototype-1 connect error:",
            error
          );

          alert(
            error?.message ||
            "Live market data connect nahi ho paya."
          );
        } finally {
          connectButton.disabled = false;
        }
      }
    );
  }

  /* =========================
     ANALYZE BUTTON
  ========================= */

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
            !Number.isFinite(amount) ||
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
            stocks.length < TARGET_TOP20
          ) {
            alert(
              "Pehle Connect Live Market Data karke live quotes load karein."
            );
            return;
          }

          analyzeButton.disabled = true;

          await analyzeInvestmentAmount(
            amount
          );

        } catch (error) {
          console.error(
            "Prototype-1 analyze error:",
            error
          );

          if (recommendation) {
            recommendation.innerHTML = `
              <div>
                <strong>
                  ⚠️ Analysis Error
                </strong>
                <br>
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
          analyzeButton.disabled = false;
        }
      }
    );
  }

  /* =========================
     INITIAL UI STATE
  ========================= */

  try {
    const stocks =
      getStocksFromMarketData();

    if (stocks.length >= TARGET_TOP20) {
      const ranked =
        smartRankStocks(stocks);

      renderTop20(ranked);
      renderWatchlist(ranked);
    }
  } catch (error) {
    console.warn(
      "Initial Prototype-1 render skipped:",
      error
    );
  }

})();
