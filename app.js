// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + SMART BUDGET ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================
  // CONFIG
  // ==========================================

  // Maximum allocation to one individual stock
  const MAX_STOCK_ALLOCATION = 0.35;

  // Maximum allocation to one business group
  // Example: ₹45,000 × 30% = ₹13,500
  const MAX_GROUP_ALLOCATION = 0.30;

  // Maximum allocation to one sector
  const MAX_SECTOR_ALLOCATION = 0.40;

  let isConnecting = false;


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      console.log("Prototype-1 app.js started.");

      bindApplication();

    }
  );


  // ==========================================
  // BIND APPLICATION
  // ==========================================

  function bindApplication() {

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


    // Prevent duplicate listeners after reload/rebinding
    if (
      connectButton.dataset.bound === "true"
    ) {

      return;

    }


    connectButton.dataset.bound = "true";


    // ========================================
    // CONNECT LIVE MARKET DATA
    // ========================================

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


        if (
          !/^\d{6}$/.test(totp)
        ) {

          showError(
            "Please current 6-digit Kotak Neo TOTP enter karein."
          );

          setMarketStatus(
            "WAITING",
            "status-pending"
          );

          return;

        }


        // Existing market-data.js live flow
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

            showError(
              message
            );

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
            error &&
            error.message
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

          connectButton.disabled =
            false;

          analyzeButton.disabled =
            false;

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

      }
    );


    // ========================================
    // ENTER KEY SUPPORT
    // ========================================

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


    // ========================================
    // EXISTING MARKET DATA
    // ========================================

    if (
      window.MARKET_DATA &&
      window.MARKET_DATA.success
    ) {

      renderTop20();

    }

  }


  // ==========================================
  // MAIN INVESTMENT FUNCTION
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


      // Current live market data only
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


      // ========================================
      // LIVE RANKING
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
      // BUILD SMART PORTFOLIO
      // ========================================

      const selected =
        buildSmartPortfolio(
          stocks,
          amount
        );


      if (!selected.length) {

        return {

          success: false,

          message:
            "Current Top 20 ke andar is budget mein suitable whole-share allocation nahi ban paaya."

        };

      }


      // ========================================
      // TOTAL
      // ========================================

      let totalInvestment =
        selected.reduce(
          function (total, stock) {

            return total +
              stock.investment;

          },
          0
        );


      // ========================================
      // HARD BUDGET SAFETY
      // ========================================

      if (
        totalInvestment >
        amount
      ) {

        console.error(
          "Budget safety triggered."
        );

        return {

          success: false,

          message:
            "Allocation budget se exceed ho rahi thi. Safe allocation generate nahi ho paya."

        };

      }


      // Remove tiny floating-point residue
      totalInvestment =
        Math.min(
          amount,
          totalInvestment
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


    // Array format
    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks;

    }


    // Object format
    if (
      typeof market.stocks !==
      "object"
    ) {

      return [];

    }


    const result =
      [];


    const keys =
      Object.keys(
        market.stocks
      );


    for (
      let i = 0;
      i < keys.length;
      i++
    ) {

      const key =
        keys[i];


      const item =
        market.stocks[key];


      if (!item) {
        continue;
      }


      result.push({

        symbol:
          item.symbol ||
          key,

        name:
          item.name ||
          item.displaySymbol ||
          key,

        sector:
          item.sector ||
          "",

        businessGroup:
          item.businessGroup ||
          item.group ||
          item.business_group ||
          "",

        price:
          item.price ??
          item.ltp ??
          item.lastPrice ??
          0,

        change:
          item.perChange ??
          item.change ??
          item.percentChange ??
          0

      });

    }


    return result;

  }


  // ==========================================
  // NORMALIZE STOCK
  // ==========================================

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
      getBusinessGroup(
        stock,
        master,
        symbol,
        name
      );


    return {

      symbol:
        symbol,

      name:
        name,

      sector:
        sector,

      businessGroup:
        businessGroup,

      price:
        price,

      change:
        change

    };

  }


  // ==========================================
  // BUSINESS GROUP
  // ==========================================

  function getBusinessGroup(
    stock,
    master,
    symbol,
    name
  ) {

    const directGroup =
      stock.businessGroup ||
      stock.group ||
      stock.business_group ||
      (
        master &&
        (
          master.businessGroup ||
          master.group ||
          master.business_group
        )
      );


    if (
      directGroup
    ) {

      return String(
        directGroup
      ).trim();

    }


    const text =
      `${symbol} ${name}`.toUpperCase();


    // ----------------------------------------
    // KNOWN GROUPS
    // ----------------------------------------

    if (
      /RELIANCE|JIO|NETWORK18/.test(text)
    ) {

      return "RELIANCE GROUP";

    }


    if (
      /ADANIENT|ADANIPORTS|ADANIPOWER|ADANIGREEN|ADANIENSOL|AMBUJACEM|ACC/.test(text)
    ) {

      return "ADANI GROUP";

    }


    if (
      /TATAMOTORS|TATASTEEL|TATACONSUM|TATAPOWER|TATAELXSI|TCS|TRENT|TITAN/.test(text)
    ) {

      return "TATA GROUP";

    }


    if (
      /HDFCBANK|HDFCLIFE|HDFCAMC/.test(text)
    ) {

      return "HDFC GROUP";

    }


    if (
      /ICICIBANK|ICICIPRULI|ICICIGI/.test(text)
    ) {

      return "ICICI GROUP";

    }


    if (
      /SBIN|SBILIFE/.test(text)
    ) {

      return "SBI GROUP";

    }


    if (
      /BHARTIARTL|INDUSTOWER/.test(text)
    ) {

      return "BHARTI GROUP";

    }


    if (
      /ITC/.test(text)
    ) {

      return "ITC GROUP";

    }


    return symbol ||
      "UNKNOWN";

  }


  // ==========================================
  // FIND NIFTY STOCK
  // ==========================================

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

      const currentSymbol =
        String(
          list[i].symbol ||
          ""
        )
          .replace(
            /-EQ$/i,
            ""
          )
          .trim()
          .toUpperCase();


      if (
        currentSymbol ===
        symbol
      ) {

        return list[i];

      }

    }


    return null;

  }


  // ==========================================
  // VALID STOCK
  // ==========================================

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


  // ==========================================
  // TOP 20 RENDER
  // ==========================================

  function renderTop20() {

    const list =
      document.getElementById(
        "top20List"
      );


    if (!list) {
      return;
    }


    const stocks =
      getStocksFromMarketData()
        .map(normalizeStock)
        .filter(isValidStock)
        .sort(
          function (a, b) {

            return b.change - a.change;

          }
        )
        .slice(0, 20);


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
          String(
            index + 1
          );


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
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;


        const price =
          document.createElement(
            "div"
          );


        price.textContent =
          `₹${formatMoney(stock.price)}`;


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


  // ==========================================
  // SMART PORTFOLIO
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


    // ----------------------------------------
    // AFFORDABLE STOCKS
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


    if (!affordable.length) {

      return [];

    }


    // ----------------------------------------
    // TARGET STOCK COUNT
    // ----------------------------------------

    let targetCount;


    if (
      amount < 5000
    ) {

      targetCount = 2;

    }

    else if (
      amount < 10000
    ) {

      targetCount = 3;

    }

    else if (
      amount < 20000
    ) {

      targetCount = 4;

    }

    else if (
      amount < 35000
    ) {

      targetCount = 5;

    }

    else if (
      amount < 50000
    ) {

      targetCount = 6;

    }

    else if (
      amount < 75000
    ) {

      targetCount = 7;

    }

    else {

      targetCount = 8;

    }


    targetCount =
      Math.min(
        targetCount,
        affordable.length
      );


    // ----------------------------------------
    // MAXIMUM MONEY PER STOCK
    // ----------------------------------------

    const maxPerStock =
      amount *
      MAX_STOCK_ALLOCATION;


    // ----------------------------------------
    // MAX GROUP MONEY
    // ----------------------------------------

    const maxPerGroup =
      amount *
      MAX_GROUP_ALLOCATION;


    // ----------------------------------------
    // MAX SECTOR MONEY
    // ----------------------------------------

    const maxPerSector =
      amount *
      MAX_SECTOR_ALLOCATION;


    // ----------------------------------------
    // RANK CANDIDATES
    // ----------------------------------------

    const candidates =
      affordable
        .map(
          function (
            stock,
            index
          ) {

            let score =
              stock.change;


            // Ranking bonus
            score +=
              Math.max(
                0,
                20 - index
              ) * 0.02;


            // Penalize very expensive stocks
            if (
              stock.price >
              amount * 0.45
            ) {

              score -=
                0.35;

            }


            return {

              ...stock,

              score:
                score

            };

          }
        )
        .sort(
          function (a, b) {

            return (
              b.score -
              a.score
            );

          }
        );


    const selected =
      [];


    const groupInvestment =
      new Map();


    const sectorInvestment =
      new Map();


    let total =
      0;


    // ========================================
    // PASS 1
    // DIVERSIFIED SELECTION
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
        normalizeGroupName(
          stock.businessGroup
        );


      const sector =
        normalizeGroupName(
          stock.sector
        );


      const currentGroupInvestment =
        groupInvestment.get(
          group
        ) || 0;


      const currentSectorInvestment =
        sectorInvestment.get(
          sector
        ) || 0;


      // --------------------------------------
      // Group already near limit
      // --------------------------------------

      if (
        currentGroupInvestment >=
        maxPerGroup
      ) {

        continue;

      }


      // --------------------------------------
      // Sector already near limit
      // --------------------------------------

      if (
        currentSectorInvestment >=
        maxPerSector
      ) {

        continue;

      }


      const remaining =
        amount -
        total;


      if (
        remaining <= 0
      ) {

        break;

      }


      // Available money for this stock
      const stockRoom =
        Math.min(
          maxPerStock,
          maxPerGroup -
            currentGroupInvestment,
          maxPerSector -
            currentSectorInvestment,
          remaining
        );


      const quantity =
        calculateQuantity(
          stock.price,
          stockRoom,
          stockRoom
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity *
        stock.price;


      if (
        total +
        investment >
        amount
      ) {

        continue;

      }


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });


      total +=
        investment;


      groupInvestment.set(
        group,
        currentGroupInvestment +
        investment
      );


      sectorInvestment.set(
        sector,
        currentSectorInvestment +
        investment
      );

    }


    // ========================================
    // PASS 2
    // FILL REMAINING SLOTS
    // ========================================

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < targetCount;
      i++
    ) {

      const stock =
        candidates[i];


      const alreadySelected =
        selected.some(
          function (item) {

            return (
              item.symbol ===
              stock.symbol
            );

          }
        );


      if (
        alreadySelected
      ) {

        continue;

      }


      const group =
        normalizeGroupName(
          stock.businessGroup
        );


      const sector =
        normalizeGroupName(
          stock.sector
        );


      const currentGroupInvestment =
        groupInvestment.get(
          group
        ) || 0;


      const currentSectorInvestment =
        sectorInvestment.get(
          sector
        ) || 0;


      const remaining =
        amount -
        total;


      if (
        remaining <= 0
      ) {

        break;

      }


      const stockRoom =
        Math.min(
          maxPerStock,
          maxPerGroup -
            currentGroupInvestment,
          maxPerSector -
            currentSectorInvestment,
          remaining
        );


      const quantity =
        calculateQuantity(
          stock.price,
          stockRoom,
          stockRoom
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity *
        stock.price;


      if (
        total +
        investment >
        amount
      ) {

        continue;

      }


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });


      total +=
        investment;


      groupInvestment.set(
        group,
        currentGroupInvestment +
        investment
      );


      sectorInvestment.set(
        sector,
        currentSectorInvestment +
        investment
      );

    }


    // ========================================
    // PASS 3
    // USE REMAINING BALANCE
    // ========================================

    let balance =
      amount -
      total;


    let improved =
      true;


    while (
      improved &&
      balance > 0
    ) {

      improved =
        false;


      const ordered =
        [...selected].sort(
          function (a, b) {

            return (
              b.score -
              a.score
            );

          }
        );


      for (
        let i = 0;
        i < ordered.length;
        i++
      ) {

        const stock =
          ordered[i];


        const group =
          normalizeGroupName(
            stock.businessGroup
          );


        const sector =
          normalizeGroupName(
            stock.sector
          );


        const currentGroupInvestment =
          groupInvestment.get(
            group
          ) || 0;


        const currentSectorInvestment =
          sectorInvestment.get(
            sector
          ) || 0;


        const stockRemainingRoom =
          maxPerStock -
          stock.investment;


        const groupRemainingRoom =
          maxPerGroup -
          currentGroupInvestment;


        const sectorRemainingRoom =
          maxPerSector -
          currentSectorInvestment;


        const allowed =
          Math.min(
            stockRemainingRoom,
            groupRemainingRoom,
            sectorRemainingRoom,
            balance
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


        groupInvestment.set(
          group,
          currentGroupInvestment +
          stock.price
        );


        sectorInvestment.set(
          sector,
          currentSectorInvestment +
          stock.price
        );


        balance =
          amount -
          total;


        improved =
          true;


        break;

      }

    }


    // ========================================
    // PASS 4
    // TRY NEW STOCK WITH BALANCE
    // ========================================

    if (
      balance > 0 &&
      selected.length < targetCount
    ) {

      for (
        let i = 0;
        i < candidates.length;
        i++
      ) {

        const stock =
          candidates[i];


        const alreadySelected =
          selected.some(
            function (item) {

              return (
                item.symbol ===
                stock.symbol
              );

            }
          );


        if (
          alreadySelected
        ) {

          continue;

        }


        if (
          stock.price >
          balance
        ) {

          continue;

        }


        const group =
          normalizeGroupName(
            stock.businessGroup
          );


        const sector =
          normalizeGroupName(
            stock.sector
          );


        const currentGroupInvestment =
          groupInvestment.get(
            group
          ) || 0;


        const currentSectorInvestment =
          sectorInvestment.get(
            sector
          ) || 0;


        const groupRoom =
          maxPerGroup -
          currentGroupInvestment;


        const sectorRoom =
          maxPerSector -
          currentSectorInvestment;


        const allowed =
          Math.min(
            balance,
            maxPerStock,
            groupRoom,
            sectorRoom
          );


        const quantity =
          calculateQuantity(
            stock.price,
            allowed,
            allowed
          );


        if (
          quantity <= 0
        ) {

          continue;

        }


        const investment =
          quantity *
          stock.price;


        if (
          total +
          investment >
          amount
        ) {

          continue;

        }


        selected.push({

          ...stock,

          quantity:
            quantity,

          investment:
            investment

        });


        total +=
          investment;


        groupInvestment.set(
          group,
          currentGroupInvestment +
          investment
        );


        sectorInvestment.set(
          sector,
          currentSectorInvestment +
          investment
        );


        balance =
          amount -
          total;


        break;

      }

    }


    // ========================================
    // FINAL HARD SAFETY
    // ========================================

    if (
      total >
      amount
    ) {

      console.error(
        "Final budget safety failed."
      );

      return [];

    }


    return selected;

  }


  // ==========================================
  // QUANTITY
  // ==========================================

  function calculateQuantity(
    price,
    available,
    maximumInvestment
  ) {

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(available) ||
      available <= 0
    ) {

      return 0;

    }


    const allowed =
      Math.min(
        available,
        maximumInvestment
      );


    return Math.max(
      0,
      Math.floor(
        allowed /
        price
      )
    );

  }


  // ==========================================
  // GROUP NAME
  // ==========================================

  function normalizeGroupName(
    value
  ) {

    const text =
      String(
        value || "UNKNOWN"
      )
        .trim()
        .toUpperCase();


    return text ||
      "UNKNOWN";

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

    let html =
      "";


    html +=
      `<div class="investment-summary">`;


    html +=
      `<div class="investment-title">Investment Plan</div>`;


    html +=
      `Amount: ₹${formatMoney(amount)}`;


    html +=
      `<br>`;


    html +=
      `Selected Stocks: ${selected.length}`;


    html +=
      `<br>`;


    html +=
      `Estimated Investment: ₹${formatMoney(totalInvestment)}`;


    html +=
      `<br>`;


    html +=
      `Balance: ₹${formatMoney(balance)}`;


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
          `<strong>${index + 1}. ${escapeHtml(stock.name)}</strong>`;


        html +=
          `<br>`;


        html +=
          `<span>${escapeHtml(stock.symbol)}</span>`;


        html +=
          `<br>`;


        html +=
          `<span>
            ${stock.quantity}
            share${stock.quantity > 1 ? "s" : ""}
          </span>`;


        html +=
          `<span
            style="margin-left:8px;"
            class="${changeClass}"
          >`;


        html +=
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;


        html +=
          `</span>`;


        html +=
          `<br>`;


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
      `₹${formatMoney(amount)} ke liye Top 20 mein se budget ke andar ${selected.length} stock(s) mein diversified allocation calculate ki gayi hai.`;


    html +=
      ` Total estimated investment ₹${formatMoney(totalInvestment)}.`;


    html +=
      ` ₹${formatMoney(balance)} balance bacha hai.`;


    html +=
      `<br>`;


    html +=
      `Business-group allocation ko maximum approximately 30% aur sector allocation ko maximum approximately 40% tak limit kiya gaya hai.`;


    html +=
      `<br>`;


    html +=
      `Individual stock allocation bhi maximum approximately 35% tak limit hai.`;


    html +=
      `<br>`;


    html +=
      `Total investment entered amount se zyada nahi ho sakta.`;


    html +=
      `<br>`;


    html +=
      `Top 20 ranking, live stock price, performance aur diversification rules ko dhyan mein rakha gaya hai.`;


    html +=
      `<br>`;


    html +=
      `Ye calculation live market data aur prototype rules par based hai. Investment ka final decision aapka hai.`;


    html +=
      `</p>`;


    return html;

  }


  // ==========================================
  // MARKET STATUS
  // ==========================================

  function setMarketStatus(
    text,
    className
  ) {

    const marketStatus =
      document.getElementById(
        "marketStatus"
      );


    if (!marketStatus) {
      return;
    }


    marketStatus.textContent =
      text;


    marketStatus.className =
      className;

  }


  // ==========================================
  // ERROR
  // ==========================================

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
  // HTML ESCAPE
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
    "Prototype-1 app.js loaded successfully."
  );

})();
