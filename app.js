// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + SMART ALLOCATION V2
// ============================================

(function () {
  "use strict";

  console.log("Prototype-1 app.js loading...");

  const MAX_STOCK_ALLOCATION = 0.35;
  const MAX_GROUP_ALLOCATION = 0.30;
  const MAX_SECTOR_ALLOCATION = 0.40;

  let isConnecting = false;

  document.addEventListener("DOMContentLoaded", bindApp);

  // ==========================================
  // APP BINDING
  // ==========================================

  function bindApp() {
    const amountInput = document.getElementById("amount");
    const totpInput = document.getElementById("totp");
    const connectButton = document.getElementById("connectButton");
    const analyzeButton = document.getElementById("analyzeButton");
    const recommendation = document.getElementById("recommendation");

    if (
      !amountInput ||
      !totpInput ||
      !connectButton ||
      !analyzeButton ||
      !recommendation
    ) {
      console.error("Required Prototype-1 elements not found.");
      return;
    }

    if (connectButton.dataset.bound === "true") return;

    connectButton.dataset.bound = "true";

    // ========================================
    // LIVE MARKET DATA
    // ========================================

    connectButton.addEventListener("click", async function () {
      if (isConnecting) return;

      const totp = String(totpInput.value || "").trim();

      hideError();

      if (!/^\d{6}$/.test(totp)) {
        showError(
          "Please current 6-digit Kotak Neo TOTP enter karein."
        );

        setMarketStatus("WAITING", "status-pending");
        return;
      }

      if (typeof window.fetchMarketData !== "function") {
        showError(
          "Market data engine load nahi hua. Page refresh karke dobara try karein."
        );
        return;
      }

      isConnecting = true;

      connectButton.disabled = true;
      analyzeButton.disabled = true;
      connectButton.textContent = "Connecting...";

      setMarketStatus("CONNECTING...", "status-pending");

      try {
        const success = await window.fetchMarketData(totp);

        if (!success) {
          const message =
            window.MARKET_DATA &&
            window.MARKET_DATA.error
              ? window.MARKET_DATA.error
              : "Live market data connect nahi ho paya.";

          showError(message);
          setMarketStatus("ERROR", "status-error");
          return;
        }

        const received = Number(
          window.MARKET_DATA.received || 0
        );

        const requested = Number(
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
      } catch (error) {
        console.error("Connect error:", error);

        showError(
          error && error.message
            ? error.message
            : "Live market data connect nahi ho paya."
        );

        setMarketStatus("ERROR", "status-error");
      } finally {
        isConnecting = false;

        connectButton.disabled = false;
        analyzeButton.disabled = false;

        connectButton.textContent =
          "Connect Live Market Data";
      }
    });

    // ========================================
    // ANALYZE
    // ========================================

    analyzeButton.addEventListener("click", function () {
      hideError();

      const amount = Number(amountInput.value);

      if (!Number.isFinite(amount) || amount <= 0) {
        recommendation.innerHTML =
          "Please valid investment amount enter karein.";
        return;
      }

      try {
        const result =
          window.analyzeInvestmentAmount(amount);

        recommendation.innerHTML =
          result && result.success
            ? result.html
            : result && result.message
              ? result.message
              : "Investment analysis available nahi hai.";
      } catch (error) {
        console.error(
          "Investment analysis error:",
          error
        );

        recommendation.innerHTML =
          "Investment analysis mein error aaya.";
      }
    });

    amountInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        analyzeButton.click();
      }
    });

    totpInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        connectButton.click();
      }
    });

    if (
      window.MARKET_DATA &&
      window.MARKET_DATA.success
    ) {
      renderTop20();
    }
  }

  // ==========================================
  // MAIN INVESTMENT ANALYSIS
  // ==========================================

  window.analyzeInvestmentAmount = function (amount) {
    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        message:
          "Please valid investment amount enter karein."
      };
    }

    let stocks = getStocksFromMarketData()
      .map(normalizeStock)
      .filter(isValidStock);

    if (!stocks.length) {
      return {
        success: false,
        message:
          "Pehle Connect Live Market Data karke live quotes load karein."
      };
    }

    // Current Top 20 only
    stocks = stocks
      .sort((a, b) => b.change - a.change)
      .slice(0, 20);

    const selected = buildSmartPortfolio(
      stocks,
      amount
    );

    if (!selected.length) {
      return {
        success: false,
        message:
          "Current Top 20 mein is budget ke andar safe whole-share allocation nahi ban paaya."
      };
    }

    const total = selected.reduce(
      (sum, stock) => sum + stock.investment,
      0
    );

    // FINAL HARD SAFETY
    if (total > amount + 0.000001) {
      console.error(
        "Budget safety check failed:",
        total,
        amount
      );

      return {
        success: false,
        message:
          "Safe budget allocation generate nahi ho paya."
      };
    }

    const balance = Math.max(
      0,
      amount - total
    );

    return {
      success: true,
      html: buildRecommendationHTML(
        amount,
        selected,
        total,
        balance
      ),
      selectedStocks: selected,
      totalInvestment: total,
      balance: balance
    };
  };

  // ==========================================
  // MARKET DATA
  // ==========================================

  function getStocksFromMarketData() {
    const market = window.MARKET_DATA;

    if (!market || !market.stocks) {
      return [];
    }

    if (Array.isArray(market.stocks)) {
      return market.stocks;
    }

    if (typeof market.stocks !== "object") {
      return [];
    }

    return Object.keys(market.stocks)
      .map(function (key) {
        const item = market.stocks[key];

        if (!item) return null;

        return {
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
            "",

          businessGroup:
            item.businessGroup ||
            item.business_group ||
            item.group ||
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
        };
      })
      .filter(Boolean);
  }

  // ==========================================
  // NORMALIZE STOCK
  // ==========================================

  function normalizeStock(stock) {
    stock = stock || {};

    const symbol = String(
      stock.symbol ||
      stock.neoSymbol ||
      stock.displaySymbol ||
      ""
    )
      .replace(/-EQ$/i, "")
      .trim()
      .toUpperCase();

    const master = findNiftyStock(symbol);

    const name = String(
      stock.name ||
      stock.companyName ||
      (master && master.name) ||
      stock.displaySymbol ||
      symbol
    ).trim();

    const price = Number(
      stock.price ??
      stock.ltp ??
      stock.lastPrice ??
      stock.close ??
      0
    );

    const change = Number(
      stock.perChange ??
      stock.change ??
      stock.percentChange ??
      0
    );

    const classification =
      getClassification(
        symbol,
        name,
        stock,
        master
      );

    return {
      symbol: symbol,
      name: name,
      sector: classification.sector,
      businessGroup: classification.businessGroup,
      price: price,
      change: change
    };
  }

  // ==========================================
  // SECTOR + BUSINESS GROUP CLASSIFICATION
  // ==========================================

  function getClassification(
    symbol,
    name,
    stock,
    master
  ) {
    const directSector =
      stock.sector ||
      (master && master.sector);

    const directGroup =
      stock.businessGroup ||
      stock.business_group ||
      stock.group ||
      (master &&
        (
          master.businessGroup ||
          master.business_group ||
          master.group
        ));

    /*
     * IMPORTANT:
     * If API gives a real sector/group,
     * use it.
     * Otherwise use local Nifty mapping.
     */

    const map = {
      APOLLOHOSP: [
        "Healthcare",
        "Apollo Hospitals Group"
      ],

      BHARTIARTL: [
        "Telecommunication",
        "Bharti Group"
      ],

      ADANIPORTS: [
        "Infrastructure",
        "Adani Group"
      ],

      ADANIENT: [
        "Diversified",
        "Adani Group"
      ],

      ICICIBANK: [
        "Financial Services",
        "ICICI Group"
      ],

      WIPRO: [
        "Information Technology",
        "Wipro Group"
      ],

      BAJAJAUTO: [
        "Automobile",
        "Bajaj Group"
      ],

      "BAJAJ-AUTO": [
        "Automobile",
        "Bajaj Group"
      ],

      HDFCBANK: [
        "Financial Services",
        "HDFC Group"
      ],

      ETERNAL: [
        "Consumer Services",
        "Eternal Group"
      ],

      BEL: [
        "Defence Electronics",
        "BEL Group"
      ],

      "M&M": [
        "Automobile",
        "Mahindra Group"
      ],

      M_M: [
        "Automobile",
        "Mahindra Group"
      ],

      SUNPHARMA: [
        "Healthcare",
        "Sun Pharma Group"
      ],

      ITC: [
        "Fast Moving Consumer Goods",
        "ITC Group"
      ],

      TITAN: [
        "Consumer Durables",
        "Tata Group"
      ],

      POWERGRID: [
        "Power",
        "Power Grid Group"
      ],

      GRASIM: [
        "Cement & Building Materials",
        "Aditya Birla Group"
      ],

      KOTAKBANK: [
        "Financial Services",
        "Kotak Group"
      ],

      LT: [
        "Construction",
        "L&T Group"
      ],

      BAJFINANCE: [
        "Financial Services",
        "Bajaj Group"
      ],

      AXISBANK: [
        "Financial Services",
        "Axis Group"
      ],

      RELIANCE: [
        "Oil Gas & Consumer Fuels",
        "Reliance Group"
      ],

      TCS: [
        "Information Technology",
        "Tata Group"
      ],

      INFY: [
        "Information Technology",
        "Infosys Group"
      ]
    };

    const local =
      map[symbol];

    return {
      sector:
        directSector &&
        String(directSector).trim() &&
        String(directSector).trim() !== "Nifty 50"
          ? String(directSector).trim()
          : local
            ? local[0]
            : "Other",

      businessGroup:
        directGroup &&
        String(directGroup).trim()
          ? String(directGroup).trim()
          : local
            ? local[1]
            : symbol || "Unknown Group"
    };
  }

  // ==========================================
  // NIFTY MASTER LOOKUP
  // ==========================================

  function findNiftyStock(symbol) {
    const list =
      Array.isArray(window.NIFTY_50_STOCKS)
        ? window.NIFTY_50_STOCKS
        : [];

    for (let i = 0; i < list.length; i++) {
      const current = String(
        list[i].symbol || ""
      )
        .replace(/-EQ$/i, "")
        .trim()
        .toUpperCase();

      if (current === symbol) {
        return list[i];
      }
    }

    return null;
  }

  // ==========================================
  // VALID STOCK
  // ==========================================

  function isValidStock(stock) {
    return Boolean(
      stock &&
      stock.symbol &&
      Number.isFinite(stock.price) &&
      stock.price > 0 &&
      Number.isFinite(stock.change)
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

    const stocks =
      getStocksFromMarketData()
        .map(normalizeStock)
        .filter(isValidStock)
        .sort((a, b) => b.change - a.change)
        .slice(0, 20);

    if (!stocks.length) {
      list.innerHTML =
        '<p class="note">Live market data available nahi hai.</p>';
      return;
    }

    const fragment =
      document.createDocumentFragment();

    stocks.forEach(function (stock, index) {
      const row =
        document.createElement("div");

      row.className = "stock";

      const left =
        document.createElement("div");

      left.className = "stock-left";

      const rank =
        document.createElement("div");

      rank.className = "rank";
      rank.textContent = index + 1;

      const info =
        document.createElement("div");

      const name =
        document.createElement("div");

      name.className = "stock-name";
      name.textContent = stock.name;

      const sector =
        document.createElement("div");

      sector.className = "stock-sector";

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
        `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;

      const price =
        document.createElement("div");

      price.textContent =
        `₹${formatMoney(stock.price)}`;

      right.appendChild(change);
      right.appendChild(price);

      row.appendChild(left);
      row.appendChild(right);

      fragment.appendChild(row);
    });

    list.replaceChildren(fragment);
  }

  // ==========================================
  // SMART PORTFOLIO V2
  // ==========================================

  function buildSmartPortfolio(
    stocks,
    amount
  ) {
    if (
      !Array.isArray(stocks) ||
      !stocks.length
    ) {
      return [];
    }

    const affordable =
      stocks.filter(
        stock => stock.price <= amount
      );

    if (!affordable.length) {
      return [];
    }

    let targetCount;

    if (amount < 5000) {
      targetCount = 2;
    } else if (amount < 10000) {
      targetCount = 3;
    } else if (amount < 20000) {
      targetCount = 4;
    } else if (amount < 35000) {
      targetCount = 5;
    } else if (amount < 50000) {
      targetCount = 6;
    } else if (amount < 75000) {
      targetCount = 7;
    } else {
      targetCount = 8;
    }

    targetCount =
      Math.min(
        targetCount,
        affordable.length
      );

    const maxStock =
      amount *
      MAX_STOCK_ALLOCATION;

    const maxGroup =
      amount *
      MAX_GROUP_ALLOCATION;

    const maxSector =
      amount *
      MAX_SECTOR_ALLOCATION;

    const candidates =
      affordable
        .map(function (stock, index) {
          let score =
            stock.change;

          score +=
            Math.max(
              0,
              20 - index
            ) * 0.02;

          /*
           * Slight penalty for a stock
           * whose price is unusually large
           * relative to the total budget.
           */
          if (
            stock.price >
            amount * 0.45
          ) {
            score -= 0.35;
          }

          return {
            ...stock,
            score: score
          };
        })
        .sort(
          (a, b) =>
            b.score - a.score
        );

    const selected = [];

    const groupTotals =
      new Map();

    const sectorTotals =
      new Map();

    let total = 0;

    // ========================================
    // PASS 1
    // Prefer different sectors + groups
    // ========================================

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < targetCount;
      i++
    ) {
      const stock =
        candidates[i];

      const group =
        normalizeKey(
          stock.businessGroup
        );

      const sector =
        normalizeKey(
          stock.sector
        );

      const groupTotal =
        groupTotals.get(group) || 0;

      const sectorTotal =
        sectorTotals.get(sector) || 0;

      const remaining =
        amount - total;

      const allowed =
        Math.min(
          remaining,
          maxStock,
          maxGroup - groupTotal,
          maxSector - sectorTotal
        );

      const quantity =
        Math.floor(
          allowed /
          stock.price
        );

      if (quantity <= 0) {
        continue;
      }

      const investment =
        quantity *
        stock.price;

      if (
        total + investment >
        amount
      ) {
        continue;
      }

      addPosition(
        selected,
        stock,
        quantity,
        investment
      );

      total += investment;

      groupTotals.set(
        group,
        groupTotal + investment
      );

      sectorTotals.set(
        sector,
        sectorTotal + investment
      );
    }

    // ========================================
    // PASS 2
    // Fill remaining slots
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
        selected.some(
          item =>
            item.symbol ===
            stock.symbol
        )
      ) {
        continue;
      }

      const group =
        normalizeKey(
          stock.businessGroup
        );

      const sector =
        normalizeKey(
          stock.sector
        );

      const groupTotal =
        groupTotals.get(group) || 0;

      const sectorTotal =
        sectorTotals.get(sector) || 0;

      const remaining =
        amount - total;

      const allowed =
        Math.min(
          remaining,
          maxStock,
          maxGroup - groupTotal,
          maxSector - sectorTotal
        );

      const quantity =
        Math.floor(
          allowed /
          stock.price
        );

      if (quantity <= 0) {
        continue;
      }

      const investment =
        quantity *
        stock.price;

      if (
        total + investment >
        amount
      ) {
        continue;
      }

      addPosition(
        selected,
        stock,
        quantity,
        investment
      );

      total += investment;

      groupTotals.set(
        group,
        groupTotal + investment
      );

      sectorTotals.set(
        sector,
        sectorTotal + investment
      );
    }

    // ========================================
    // PASS 3
    // USE REMAINING BALANCE
    // ========================================

    let balance =
      amount - total;

    let changed = true;

    while (
      changed &&
      balance > 0
    ) {
      changed = false;

      const ordered =
        selected
          .slice()
          .sort(
            (a, b) =>
              b.score - a.score
          );

      for (
        let i = 0;
        i < ordered.length;
        i++
      ) {
        const stock =
          ordered[i];

        const group =
          normalizeKey(
            stock.businessGroup
          );

        const sector =
          normalizeKey(
            stock.sector
          );

        const groupTotal =
          groupTotals.get(group) || 0;

        const sectorTotal =
          sectorTotals.get(sector) || 0;

        const allowed =
          Math.min(
            balance,
            maxStock - stock.investment,
            maxGroup - groupTotal,
            maxSector - sectorTotal
          );

        if (
          allowed <
          stock.price
        ) {
          continue;
        }

        stock.quantity += 1;

        stock.investment +=
          stock.price;

        total +=
          stock.price;

        balance -=
          stock.price;

        groupTotals.set(
          group,
          groupTotal +
          stock.price
        );

        sectorTotals.set(
          sector,
          sectorTotal +
          stock.price
        );

        changed = true;
        break;
      }
    }

    // ========================================
    // FINAL VALIDATION
    // ========================================

    if (
      total >
      amount + 0.000001
    ) {
      return [];
    }

    for (
      let i = 0;
      i < selected.length;
      i++
    ) {
      const stock =
        selected[i];

      if (
        stock.investment >
        maxStock + 0.000001
      ) {
        console.error(
          "Individual stock limit failed."
        );

        return [];
      }
    }

    return selected;
  }

  // ==========================================
  // ADD POSITION
  // ==========================================

  function addPosition(
    selected,
    stock,
    quantity,
    investment
  ) {
    selected.push({
      ...stock,
      quantity: quantity,
      investment: investment
    });
  }

  // ==========================================
  // KEY
  // ==========================================

  function normalizeKey(value) {
    return (
      String(
        value || "UNKNOWN"
      )
        .trim()
        .toUpperCase() ||
      "UNKNOWN"
    );
  }

  // ==========================================
  // RECOMMENDATION HTML
  // ==========================================

  function buildRecommendationHTML(
    amount,
    selected,
    total,
    balance
  ) {
    let html = "";

    html +=
      `<div class="investment-summary">`;

    html +=
      `<div class="investment-title">Investment Plan</div>`;

    html +=
      `Amount: ₹${formatMoney(amount)}`;

    html += `<br>`;

    html +=
      `Selected Stocks: ${selected.length}`;

    html += `<br>`;

    html +=
      `Estimated Investment: ₹${formatMoney(total)}`;

    html += `<br>`;

    html +=
      `Balance: ₹${formatMoney(balance)}`;

    html +=
      `</div>`;

    selected.forEach(
      function (stock, index) {
        const cls =
          stock.change >= 0
            ? "positive"
            : "negative";

        html +=
          `<div style="
            padding:12px 0;
            border-bottom:1px solid #252d38;
          ">`;

        html +=
          `<strong>${index + 1}. ${escapeHtml(stock.name)}</strong>`;

        html += `<br>`;

        html +=
          `<span>${escapeHtml(stock.symbol)} • ${escapeHtml(stock.sector)}</span>`;

        html += `<br>`;

        html +=
          `<span>${stock.quantity} share${stock.quantity > 1 ? "s" : ""}</span>`;

        html +=
          `<span style="margin-left:8px;" class="${cls}">`;

        html +=
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;

        html += `</span>`;

        html += `<br>`;

        html +=
          `Price: ₹${formatMoney(stock.price)}`;

        html +=
          ` &nbsp; • &nbsp; `;

        html +=
          `Invest: ₹${formatMoney(stock.investment)}`;

        html +=
          `</div>`;
      }
    );

    html +=
      `<p style="margin-top:14px;line-height:1.6;">`;

    html +=
      `₹${formatMoney(amount)} ke liye current Top 20 mein se ${selected.length} stock(s) ka whole-share diversified allocation calculate kiya gaya hai.`;

    html += `<br>`;

    html +=
      `Individual stock allocation maximum ~35%, business-group allocation maximum ~30% aur sector allocation maximum ~40% rakha gaya hai.`;

    html += `<br>`;

    html +=
      `Total estimated investment ₹${formatMoney(total)} hai aur ₹${formatMoney(balance)} balance bacha hai.`;

    html += `<br>`;

    html +=
      `Total investment entered
