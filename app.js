// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + NIFTY WEIGHT SMART ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");


  // ==========================================
  // CONFIG
  // ==========================================

  const MAX_STOCK_ALLOCATION = 0.35;
  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  let isConnecting = false;


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      console.log("Prototype-1 app.js started.");

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

          if (isConnecting) {
            return;
          }

          const totp =
            String(
              totpInput.value || ""
            ).trim();

          hideError();


          // ------------------------------------
          // TOTP VALIDATION
          // ------------------------------------

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


          // ------------------------------------
          // CHECK MARKET ENGINE
          // ------------------------------------

          if (
            typeof window.fetchMarketData !==
            "function"
          ) {

            showError(
              "Market data engine load nahi hua. Page refresh karke dobara try karein."
            );

            return;

          }


          // ------------------------------------
          // CONNECTING STATE
          // ------------------------------------

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
      // EXISTING DATA
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


      // ----------------------------------------
      // CURRENT LIVE MARKET DATA
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
      // LIVE RANKING
      // ----------------------------------------

      stocks.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );


      // ----------------------------------------
      // ONLY TOP 20
      // ----------------------------------------

      stocks =
        stocks.slice(0, 20);


      // ----------------------------------------
      // SMART NIFTY-WEIGHT PORTFOLIO
      // ----------------------------------------

      const selected =
        buildSmartPortfolio(
          stocks,
          amount
        );


      if (!selected.length) {

        return {

          success: false,

          message:
            "Current Top 20 ke andar is budget mein whole-share allocation nahi ban paaya."

        };

      }


      // ----------------------------------------
      // TOTAL
      // ----------------------------------------

      let totalInvestment =
        selected.reduce(
          function (sum, stock) {

            return (
              sum +
              Number(stock.investment || 0)
            );

          },
          0
        );


      // FINAL HARD SAFETY
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


    // ----------------------------------------
    // ARRAY
    // ----------------------------------------

    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks;

    }


    // ----------------------------------------
    // OBJECT
    // ----------------------------------------

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
          item.promoterGroup ||
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
          0,

        niftyWeight:
          item.niftyWeight ??
          item.weight ??
          item.indexWeight ??
          0

      });

    }


    return result;

  }


  // ==========================================
  // NIFTY FALLBACK WEIGHTS
  // ==========================================

  const NIFTY_WEIGHT_FALLBACK = {

    HDFCBANK: 13.2,
    RELIANCE: 8.9,
    ICICIBANK: 8.1,
    BHARTIARTL: 5.9,
    INFY: 5.1,
    TCS: 3.9,
    LT: 3.7,
    ITC: 3.2,
    AXISBANK: 3.0,
    KOTAKBANK: 2.8,
    SBIN: 2.7,
    "M&M": 2.7,
    BAJFINANCE: 2.5,
    HINDUNILVR: 2.2,
    SUNPHARMA: 1.9,
    MARUTI: 1.8,
    TITAN: 1.7,
    ADANIENT: 1.5,
    ADANIPORTS: 1.5,
    HCLTECH: 1.5,
    BEL: 1.4,
    TATASTEEL: 1.3,
    NTPC: 1.3,
    POWERGRID: 1.2,
    ONGC: 1.1,
    WIPRO: 1.0,
    COALINDIA: 0.9,
    ETERNAL: 0.9,
    GRASIM: 0.9,
    TECHM: 0.8,
    JSWSTEEL: 0.8,
    TRENT: 0.8,
    HINDALCO: 0.8,
    TATAMOTORS: 0.8,
    NESTLEIND: 0.7,
    DRREDDY: 0.7,
    APOLLOHOSP: 0.7,
    CIPLA: 0.7,
    EICHERMOT: 0.6,
    "BAJAJ-AUTO": 0.6,
    SHRIRAMFIN: 0.6,
    HEROMOTOCO: 0.5,
    INDUSINDBK: 0.5,
    BPCL: 0.5,
    UPL: 0.4,
    ASIANPAINT: 0.4,
    BRITANNIA: 0.4,
    SBILIFE: 0.4,
    TATACONSUM: 0.4

  };


  // ==========================================
  // NORMALIZE
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
      );


    const businessGroup =
      String(
        stock.businessGroup ||
        stock.group ||
        stock.promoterGroup ||
        (
          master &&
          (
            master.businessGroup ||
            master.group ||
            master.promoterGroup
          )
        ) ||
        getBusinessGroup(symbol)
      );


    const liveWeight =
      Number(
        stock.niftyWeight ??
        stock.weight ??
        stock.indexWeight ??
        0
      );


    const masterWeight =
      Number(
        master &&
        (
          master.niftyWeight ??
          master.weight ??
          master.indexWeight
        )
      ) || 0;


    const fallbackWeight =
      Number(
        NIFTY_WEIGHT_FALLBACK[
          symbol
        ] || 0
      );


    const niftyWeight =
      liveWeight > 0
        ? liveWeight
        : masterWeight > 0
        ? masterWeight
        : fallbackWeight;


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
        change,

      niftyWeight:
        niftyWeight > 0
          ? niftyWeight
          : 1

    };

  }


  // ==========================================
  // BUSINESS GROUP
  // ==========================================

  function getBusinessGroup(
    symbol
  ) {

    const groups = {

      RELIANCE:
        "Reliance",

      JIOFIN:
        "Reliance",

      ADANIENT:
        "Adani",

      ADANIPORTS:
        "Adani",

      APOLLOHOSP:
        "Apollo",

      BAJAJ-AUTO:
        "Bajaj",

      BAJFINANCE:
        "Bajaj",

      "M&M":
        "Mahindra",

      MARUTI:
        "Independent",

      TATAMOTORS:
        "Tata",

      TATASTEEL:
        "Tata",

      TATACONSUM:
        "Tata",

      TITAN:
        "Tata",

      ITC:
        "ITC",

      HDFCBANK:
        "HDFC",

      HDFC:
        "HDFC",

      ICICIBANK:
        "ICICI",

      KOTAKBANK:
        "Kotak",

      AXISBANK:
        "Axis",

      SBIN:
        "SBI"

    };


    return (
      groups[symbol] ||
      symbol
    );

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

      if (
        String(
          list[i].symbol || ""
        )
          .replace(
            /-EQ$/i,
            ""
          )
          .toUpperCase() ===
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
  // SMART NIFTY-WEIGHT PORTFOLIO
  // ==========================================

  function buildSmartPortfolio(
    stocks,
    amount
  ) {

    if (
      !Array.isArray(stocks) ||
      !stocks.length ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return [];

    }


    /*
     * TOP 20 ke andar affordable stocks.
     */

    const candidates =
      stocks.filter(
        function (stock) {

          return (
            stock.price > 0 &&
            stock.price <= amount
          );

        }
      );


    if (!candidates.length) {
      return [];
    }


    /*
     * Current Top 20 ka total Nifty weight.
     *
     * Har stock ka target:
     *
     * stock weight / Top20 total weight
     * × user budget
     */

    const totalWeight =
      candidates.reduce(
        function (sum, stock) {

          return (
            sum +
            Number(
              stock.niftyWeight || 0
            )
          );

        },
        0
      );


    if (
      totalWeight <= 0
    ) {

      return [];

    }


    const maxPerStock =
      amount *
      MAX_STOCK_ALLOCATION;


    const maxPerSector =
      amount *
      MAX_SECTOR_ALLOCATION;


    const maxPerGroup =
      amount *
      MAX_GROUP_ALLOCATION;


    /*
     * Target allocation calculate.
     */

    const prepared =
      candidates
        .map(
          function (stock) {

            const targetPercent =
              (
                stock.niftyWeight /
                totalWeight
              ) * 100;


            const targetAmount =
              amount *
              (
                targetPercent /
                100
              );


            return {

              ...stock,

              targetPercent:
                targetPercent,

              targetAmount:
                targetAmount,

              score:
                calculateStockScore(
                  stock
                )

            };

          }
        )
        .sort(
          function (a, b) {

            /*
             * Weight first,
             * live performance as small tie-breaker.
             */

            if (
              b.niftyWeight !==
              a.niftyWeight
            ) {

              return (
                b.niftyWeight -
                a.niftyWeight
              );

            }


            return (
              b.score -
              a.score
            );

          }
        );


    const selected =
      [];


    let total =
      0;


    /*
     * ========================================
     * PASS 1
     *
     * Har possible Top-20 stock ko minimum
     * one-share opportunity dene ki koshish.
     *
     * Isse budget allow karne par portfolio
     * sirf 2-4 companies tak limited nahi hoga.
     * ========================================
     */

    for (
      let i = 0;
      i < prepared.length;
      i++
    ) {

      const stock =
        prepared[i];


      const remaining =
        amount -
        total;


      if (
        remaining <
        stock.price
      ) {

        continue;

      }


      if (
        stock.price >
        maxPerStock
      ) {

        continue;

      }


      const quantity =
        calculateAllowedQuantity(
          stock,
          remaining,
          maxPerStock,
          maxPerSector,
          maxPerGroup,
          selected,
          amount
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity *
        stock.price;


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });


      total +=
        investment;

    }


    /*
     * ========================================
     * PASS 2
     *
     * Target Nifty allocation ke closest
     * jaane ke liye additional shares.
     * ========================================
     */

    let safetyCounter =
      0;


    while (
      safetyCounter < 500
    ) {

      safetyCounter++;


      const remaining =
        amount -
        total;


      if (
        remaining <= 0
      ) {

        break;

      }


      let best =
        null;


      let bestScore =
        -Infinity;


      prepared.forEach(
        function (stock) {

          if (
            stock.price >
            remaining
          ) {

            return;

          }


          const existing =
            selected.find(
              function (item) {

                return (
                  item.symbol ===
                  stock.symbol
                );

              }
            );


          const currentInvestment =
            existing
              ? existing.investment
              : 0;


          /*
           * Individual stock cap.
           */

          if (
            currentInvestment +
            stock.price >
            maxPerStock
          ) {

            return;

          }


          /*
           * Sector cap.
           */

          const currentSector =
            getAllocationByKey(
              selected,
              "sector",
              stock.sector
            );


          if (
            currentSector +
            stock.price >
            maxPerSector
          ) {

            return;

          }


          /*
           * Business-group cap.
           */

          const currentGroup =
            getAllocationByKey(
              selected,
              "businessGroup",
              stock.businessGroup
            );


          if (
            currentGroup +
            stock.price >
            maxPerGroup
          ) {

            return;

          }


          /*
           * Target gap.
           */

          const beforeGap =
            Math.abs(
              stock.targetAmount -
              currentInvestment
            );


          const afterGap =
            Math.abs(
              stock.targetAmount -
              (
                currentInvestment +
                stock.price
              )
            );


          const improvement =
            beforeGap -
            afterGap;


          /*
           * Weight priority +
           * target improvement +
           * live performance.
           */

          const score =
            improvement * 1000 +
            stock.niftyWeight * 10 +
            stock.change * 0.1;


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
      );


      if (!best) {
        break;
      }


      const existing =
        selected.find(
          function (item) {

            return (
              item.symbol ===
              best.symbol
            );

          }
        );


      if (existing) {

        existing.quantity +=
          1;

        existing.investment +=
          best.price;

      }

      else {

        selected.push({

          ...best,

          quantity:
            1,

          investment:
            best.price

        });

      }


      total +=
        best.price;

    }


    /*
     * ========================================
     * PASS 3
     *
     * Remaining balance ko practical way
     * se use karna.
     * ========================================
     */

    let balance =
      amount -
      total;


    while (
      balance > 0
    ) {

      let best =
        null;

      let bestScore =
        -Infinity;


      selected.forEach(
        function (stock) {

          if (
            stock.price >
            balance
          ) {

            return;

          }


          if (
            stock.investment +
            stock.price >
            maxPerStock
          ) {

            return;

          }


          const currentSector =
            getAllocationByKey(
              selected,
              "sector",
              stock.sector
            );


          if (
            currentSector +
            stock.price >
            maxPerSector
          ) {

            return;

          }


          const currentGroup =
            getAllocationByKey(
              selected,
              "businessGroup",
              stock.businessGroup
            );


          if (
            currentGroup +
            stock.price >
            maxPerGroup
          ) {

            return;

          }


          const gap =
            Math.max(
              0,
              stock.targetAmount -
              stock.investment
            );


          const score =
            gap * 1000 +
            stock.niftyWeight * 10;


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
      );


      if (!best) {
        break;
      }


      best.quantity +=
        1;

      best.investment +=
        best.price;

      total +=
        best.price;

      balance -=
        best.price;

    }


    /*
     * ========================================
     * FINAL HARD SAFETY
     * ========================================
     */

    let finalTotal =
      selected.reduce(
        function (sum, stock) {

          return (
            sum +
            stock.investment
          );

        },
        0
      );


    if (
      finalTotal >
      amount
    ) {

      /*
       * Remove shares from the least
       * important positions until safe.
       */

      const safetyOrder =
        [...selected].sort(
          function (a, b) {

            return (
              a.niftyWeight -
              b.niftyWeight
            );

          }
        );


      for (
        let i = 0;
        i < safetyOrder.length &&
        finalTotal > amount;
        i++
      ) {

        const stock =
          safetyOrder[i];


        while (
          stock.quantity > 0 &&
          finalTotal > amount
        ) {

          stock.quantity -=
            1;

          stock.investment -=
            stock.price;

          finalTotal -=
            stock.price;

        }

      }


      /*
       * Zero quantity entries remove.
       */

      for (
        let i = selected.length - 1;
        i >= 0;
        i--
      ) {

        if (
          selected[i].quantity <= 0
        ) {

          selected.splice(
            i,
            1
          );

        }

      }

    }


    return selected;

  }


  // ==========================================
  // STOCK SCORE
  // ==========================================

  function calculateStockScore(
    stock
  ) {

    return (
      Number(stock.niftyWeight || 0) +
      Number(stock.change || 0) * 0.1
    );

  }


  // ==========================================
  // ALLOWED QUANTITY
  // ==========================================

  function calculateAllowedQuantity(
    stock,
    remaining,
    maxPerStock,
    maxPerSector,
    maxPerGroup,
    selected,
    amount
  ) {

    if (
      !stock ||
      !Number.isFinite(stock.price) ||
      stock.price <= 0
    ) {

      return 0;

    }


    let allowed =
      Math.min(
        remaining,
        maxPerStock
      );


    const sectorUsed =
      getAllocationByKey(
        selected,
        "sector",
        stock.sector
      );


    allowed =
      Math.min(
        allowed,
        Math.max(
          0,
          maxPerSector -
          sectorUsed
        )
      );


    const groupUsed =
      getAllocationByKey(
        selected,
        "businessGroup",
        stock.businessGroup
      );


    allowed =
      Math.min(
        allowed,
        Math.max(
          0,
          maxPerGroup -
          groupUsed
        )
      );


    /*
     * Safety: kabhi budget se upar nahi.
     */

    allowed =
      Math.min(
        allowed,
        amount
      );


    return Math.floor(
      allowed /
      stock.price
    );

  }


  // ==========================================
  // GET ALLOCATION
  // ==========================================

  function getAllocationByKey(
    selected,
    key,
    value
  ) {

    if (
      !Array.isArray(selected)
    ) {

      return 0;

    }


    return selected.reduce(
      function (sum, stock) {

        if (
          String(
            stock[key] || ""
          ) ===
          String(
            value || ""
          )
        ) {

          return (
            sum +
            Number(
              stock.investment || 0
            )
          );

        }


        return sum;

      },
      0
    );

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


    /*
     * ========================================
     * SUMMARY
     * ========================================
     */

    html +=
      `<div class="investment-summary">`;


    html +=
      `<div class="investment-title">
        Nifty Top-20 Weight Based Investment Plan
      </div>`;


    html +=
      `<div style="margin-top:8px;">
        Budget:
        <strong>
          ₹${formatMoney(amount)}
        </strong>
      </div>`;


    html +=
      `<div>
        Stocks Selected:
        <strong>
          ${selected.length}
        </strong>
      </div>`;


    html +=
      `<div>
        Total Investment:
        <strong>
          ₹${formatMoney(totalInvestment)}
        </strong>
      </div>`;


    html +=
      `<div>
        Remaining Balance:
        <strong>
          ₹${formatMoney(balance)}
        </strong>
      </div>`;


    html +=
      `</div>`;


    /*
     * ========================================
     * MAIN TABLE
     * ========================================
     */

    html +=
      `<div style="
        overflow-x:auto;
        margin-top:14px;
      ">`;


    html +=
      `<table style="
        width:100%;
        border-collapse:collapse;
        font-size:13px;
      ">`;


    html +=
      `<thead>`;


    html +=
      `<tr>`;


    html +=
      `<th style="padding:8px;text-align:left;">
        #
      </th>`;


    html +=
      `<th style="padding:8px;text-align:left;">
        Stock
      </th>`;


    html +=
      `<th style="padding:8px;text-align:right;">
        Nifty %
      </th>`;


    html +=
      `<th style="padding:8px;text-align:right;">
        Target ₹
      </th>`;


    html +=
      `<th style="padding:8px;text-align:right;">
        Qty
      </th>`;


    html +=
      `<th style="padding:8px;text-align:right;">
        Actual ₹
      </th>`;


    html +=
      `<th style="padding:8px;text-align:right;">
        Actual %
      </th>`;


    html +=
      `</tr>`;


    html +=
      `</thead>`;


    html +=
      `<tbody>`;


    selected.forEach(
      function (
        stock,
        index
      ) {

        const actualPercent =
          amount > 0
            ? (
                stock.investment /
                amount
              ) * 100
            : 0;


        const targetPercent =
          Number(
            stock.targetPercent || 0
          );


        html +=
          `<tr style="
            border-top:1px solid #252d38;
          ">`;


        html +=
          `<td style="padding:8px;">
            ${index + 1}
          </td>`;


        html +=
          `<td style="padding:8px;">
            <strong>
              ${escapeHtml(stock.name)}
            </strong>
            <br>
            <small>
              ${escapeHtml(stock.symbol)}
            </small>
          </td>`;


        html +=
          `<td style="
            padding:8px;
            text-align:right;
          ">
            ${targetPercent.toFixed(2)}%
          </td>`;


        html +=
          `<td style="
            padding:8px;
            text-align:right;
          ">
            ₹${formatMoney(stock.targetAmount)}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            text-align:right;
          ">
            ${stock.quantity}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            text-align:right;
          ">
            ₹${formatMoney(stock.investment)}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            text-align:right;
          ">
            ${actualPercent.toFixed(2)}%
          </td>`;


        html +=
          `</tr>`;

      }
    );


    html +=
      `</tbody>`;


    html +=
      `</table>`;


    html +=
      `</div>`;


    /*
     * ========================================
     * DETAIL TABLE
     * ========================================
     */

    html +=
      `<div style="
        overflow-x:auto;
        margin-top:16px;
      ">`;


    html +=
      `<table style="
        width:100%;
        border-collapse:collapse;
        font-size:12px;
      ">`;


    html +=
      `<thead>`;


    html +=
      `<tr>`;


    html +=
      `<th style="padding:7px;text-align:left;">
        Stock
      </th>`;


    html +=
      `<th style="padding:7px;text-align:right;">
        Price
      </th>`;


    html +=
      `<th style="padding:7px;text-align:right;">
        Change
      </th>`;


    html +=
      `<th style="padding:7px;text-align:left;">
        Sector
      </th>`;


    html +=
      `<th style="padding:7px;text-align:left;">
        Group
      </th>`;


    html +=
      `</tr>`;


    html +=
      `</thead>`;


    html +=
      `<tbody>`;


    selected.forEach(
      function (stock) {

        const changeClass =
          stock.change >= 0
            ? "positive"
            : "negative";


        html +=
          `<tr style="
            border-top:1px solid #252d38;
          ">`;


        html +=
          `<td style="padding:7px;">
            ${escapeHtml(stock.symbol)}
          </td>`;


        html +=
          `<td style="
            padding:7px;
            text-align:right;
          ">
            ₹${formatMoney(stock.price)}
          </td>`;


        html +=
          `<td style="
            padding:7px;
            text-align:right;
          "
          class="${changeClass}">
            ${stock.change >= 0 ? "+" : ""}
            ${stock.change.toFixed(2)}%
          </td>`;


        html +=
          `<td style="padding:7px;">
            ${escapeHtml(stock.sector)}
          </td>`;


        html +=
          `<td style="padding:7px;">
            ${escapeHtml(stock.businessGroup)}
          </td>`;


        html +=
          `</tr>`;

      }
    );


    html +=
      `</tbody>`;


    html +=
      `</table>`;


    html +=
      `</div>`;


    /*
     * ========================================
     * EXPLANATION
     * ========================================
     */

    html +=
      `<div style="
        margin-top:16px;
        padding:12px;
        border:1px solid #252d38;
        border-radius:8px;
        line-height:1.7;
      ">`;


    html +=
      `<strong>
        Calculation Summary
      </strong>`;


    html +=
      `<br>`;


    html +=
      `Top 20 ke Nifty-50 weight proportion
      ko target allocation maana gaya hai.`;


    html +=
      `<br>`;


    html +=
      `Budget:
      <strong>
        ₹${formatMoney(amount)}
      </strong>`;


    html +=
      `<br>`;


    html +=
      `Whole-share actual investment:
      <strong>
        ₹${formatMoney(totalInvestment)}
      </strong>`;


    html +=
      `<br>`;


    html +=
      `Remaining:
      <strong>
        ₹${formatMoney(balance)}
      </strong>`;


    html +=
      `<br><br>`;


    html +=
      `<strong>
        Diversification Rules
      </strong>`;


    html +=
      `<br>
      • Top 20 stocks only`;


    html +=
      `<br>
      • Nifty-weight based target allocation`;


    html +=
      `<br>
      • Individual stock maximum ~35%`;


    html +=
      `<br>
      • Sector maximum ~40%`;


    html +=
      `<br>
      • Business-group maximum ~30%`;


    html +=
      `<br>
      • Whole shares only`;


    html +=
      `<br>
      • Remaining balance ko practical way se use karne ki koshish`;


    html +=
      `</div>`;


    /*
     * ========================================
     * FINAL MESSAGE
     * ========================================
     */

    html +=
      `<p style="
        margin-top:14px;
        line-height:1.7;
      ">`;


    html +=
      `₹${formatMoney(amount)} ke budget ke liye
      current Top 20 mein Nifty-weight based
      diversified whole-share allocation calculate
      ki gayi hai.`;


    html +=
      `<br><br>`;


    html +=
      `Actual allocation whole shares ki wajah se
      target percentage se thoda different ho sakta hai.`;


    html +=
      `<br><br>`;


    html +=
      `<strong>
        Total investment entered amount se
        kabhi zyada nahi hoga.
      </strong>`;


    html +=
      `<br><br>`;


    html +=
      `Ye calculation live market data,
      current Top-20 ranking aur prototype
      diversification rules par based hai.
      Investment ka final decision aapka hai.`;


    html +=
      `</p>`;


    html +=
      `<div style="
        margin-top:12px;
        font-size:12px;
        opacity:.8;
      ">
        Prototype-1 • AI analysis based on available data.
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
