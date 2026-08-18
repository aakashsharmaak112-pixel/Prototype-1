// ============================================
// PROTOTYPE-1
// APP ENGINE V3
// LIVE MARKET DATA
// RANK + MOMENTUM
// SMART WHOLE-SHARE ALLOCATION
// DYNAMIC SMALL-BUDGET DIVERSIFICATION
// SECTOR + BUSINESS GROUP CONTROL
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js V3 loading...");


  // ==========================================
  // SAFETY / DIVERSIFICATION LIMITS
  // ==========================================

  const HARD_MAX_STOCK = 0.35;

  // Normal target
  const NORMAL_MAX_STOCK = 0.20;

  // Small-budget exception:
  // Agar ek share 20% se thoda upar hai,
  // to maximum 25% tak allow hoga.
  const SMALL_BUDGET_MAX_STOCK = 0.25;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;


  // ==========================================
  // ENGINE SETTINGS
  // ==========================================

  const TARGET_TOP20 = 20;

  const MIN_DIVERSIFIED_STOCKS = 5;

  const MAX_SEARCH_ITERATIONS = 20000;

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


      // ========================================
      // GET LIVE STOCKS
      // ========================================

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
      // SMART RANKING
      // ========================================

      stocks =
        smartRankStocks(stocks);


      const top20 =
        stocks.slice(
          0,
          TARGET_TOP20
        );


      if (!top20.length) {

        return {

          success: false,

          message:
            "Current Top 20 market data available nahi hai."

        };

      }


      // ========================================
      // BUILD V3 PLAN
      // ========================================

      const result =
        buildSmartDiversifiedPlan(
          top20,
          amount
        );


      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            top20,
            result
          ),

        selectedStocks:
          result.selected
            .filter(
              stock => stock.quantity > 0
            ),

        totalInvestment:
          result.totalInvestment,

        balance:
          result.balance,

        top20:
          top20

      };

    };


  // ==========================================
  // SMART RANKING
  // ==========================================

  function smartRankStocks(stocks) {

    return stocks
      .map(
        function (stock) {

          const master =
            findNiftyStock(
              stock.symbol
            );


          const liveChange =
            Number(
              stock.change || 0
            );


          // Positive momentum gets bonus.
          // Ranking remains primarily based
          // on live market movement.

          const momentumScore =
            Math.max(
              -5,
              Math.min(
                5,
                liveChange
              )
            );


          const baseScore =
            liveChange;


          const masterPriority =
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
              baseScore +
              momentumScore * 0.10 +
              masterPriority * 0.001

          };

        }
      )
      .sort(
        function (a, b) {

          return (
            b.engineScore -
            a.engineScore
          );

        }
      );

  }


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
    ).forEach(
      function (key) {

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

      }
    );


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


  // ==========================================
  // BUSINESS GROUP
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

      BAJAJFINSV:
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


    const stocks =
      getStocksFromMarketData()
        .map(normalizeStock)
        .filter(isValidStock);


    const ranked =
      smartRankStocks(
        stocks
      )
      .slice(
        0,
        TARGET_TOP20
      );


    if (!ranked.length) {

      list.innerHTML =
        '<p class="note">Live market data available nahi hai.</p>';

      return;

    }


    const fragment =
      document.createDocumentFragment();


    ranked.forEach(
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
  // V3 SMART DIVERSIFICATION PLAN
  // ==========================================

  function buildSmartDiversifiedPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;


    // ========================================
    // RANK WEIGHTS
    // ========================================

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


    const targets =
      {};


    rankWeights.forEach(
      function (item) {

        targets[item.symbol] =
          item.weight /
          weightTotal;

      }
    );


    // ========================================
    // CREATE STOCK OBJECTS
    // ========================================

    const selected =
      stocks.map(
        function (stock, index) {

          const targetPercent =
            targets[
              stock.symbol
            ] || 0;


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

            quantity: 0,

            investment: 0,

            actualPercent: 0,

            sectorPercent: 0,

            groupPercent: 0,

            allocationScore: 0

          };

        }
      );


    // ========================================
    // PHASE 1
    //
    // Diversification seeds.
    //
    // Pehle different sectors/groups se
    // useful affordable stocks ko consider
    // kiya jayega.
    // ========================================

    let total =
      0;


    let balance =
      budget;


    const seedCandidates =
      selected
        .filter(
          stock =>
            stock.price <=
            balance
        )
        .map(
          function (stock) {

            return {

              stock,

              score:
                seedScore(
                  stock,
                  selected,
                  budget
                )

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


    const usedSectors = {};
    const usedGroups = {};


    for (
      let i = 0;
      i < seedCandidates.length;
      i++
    ) {

      if (
        countPositiveStocks(
          selected
        ) >=
        MIN_DIVERSIFIED_STOCKS
      ) {

        break;

      }


      const stock =
        seedCandidates[i].stock;


      const sector =
        stock.sector ||
        "Nifty 50";


      const group =
        stock.businessGroup ||
        stock.symbol;


      if (
        usedSectors[sector] &&
        usedGroups[group]
      ) {

        continue;

      }


      if (
        !canAddShareV3(
          stock,
          selected,
          budget,
          balance,
          total,
          true
        )
      ) {

        continue;

      }


      stock.quantity += 1;

      stock.investment +=
        stock.price;


      total +=
        stock.price;


      balance =
        Math.max(
          0,
          budget - total
        );


      usedSectors[sector] =
        true;

      usedGroups[group] =
        true;

    }


    // ========================================
    // PHASE 2
    //
    // Smart whole-share optimization
    // ========================================

    let guard =
      0;


    while (
      balance > 0 &&
      guard < MAX_SEARCH_ITERATIONS
    ) {

      guard++;


      const candidates =
        selected
          .filter(
            stock =>
              canAddShareV3(
                stock,
                selected,
                budget,
                balance,
                total,
                false
              )
          )
          .map(
            function (stock) {

              const score =
                calculateV3Score(
                  stock,
                  selected,
                  budget,
                  balance,
                  total
                );


              stock.allocationScore =
                score;


              return {

                stock,

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


      if (!candidates.length) {

        break;

      }


      // --------------------------------------
      // Prefer a candidate which leaves
      // less unused money when possible.
      // --------------------------------------

      const best =
        chooseBestCandidate(
          candidates,
          balance,
          selected,
          budget
        );


      if (!best) {

        break;

      }


      const chosen =
        best.stock;


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
    // PHASE 3
    //
    // Remaining-balance improvement.
    //
    // Try a small combination search to avoid
    // leaving unnecessary cash unused.
    // ========================================

    const optimized =
      optimizeRemainingBudget(
        selected,
        budget,
        total,
        balance
      );


    if (
      optimized &&
      optimized.changed
    ) {

      applyOptimization(
        selected,
        optimized
      );


      total =
        calculateTotalInvestment(
          selected
        );


      balance =
        Math.max(
          0,
          budget - total
        );

    }


    // ========================================
    // FINAL CALCULATIONS
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
  // SEED SCORE
  // ==========================================

  function seedScore(
    stock,
    selected,
    budget
  ) {

    const priceRatio =
      stock.price /
      Math.max(
        budget,
        1
      );


    const rankScore =
      (
        stock.rankWeight /
        Math.max(
          selected.length,
          1
        )
      );


    const momentum =
      Math.max(
        -2,
        Math.min(
          2,
          stock.change
        )
      );


    const sectorExisting =
      getSectorTotals(
        selected
      )[
        stock.sector ||
        "Nifty 50"
      ] || 0;


    const groupExisting =
      getGroupTotals(
        selected
      )[
        stock.businessGroup ||
        stock.symbol
      ] || 0;


    const sectorPenalty =
      sectorExisting /
      Math.max(
        budget,
        1
      );


    const groupPenalty =
      groupExisting /
      Math.max(
        budget,
        1
      );


    return (

      rankScore * 5

      +

      momentum * 0.4

      +

      (1 - priceRatio) * 2

      +

      (1 - sectorPenalty) * 2

      +

      (1 - groupPenalty) * 2

    );

  }


  // ==========================================
  // CAN ADD SHARE V3
  // ==========================================

  function canAddShareV3(
    stock,
    selected,
    budget,
    balance,
    total,
    seedMode
  ) {

    if (!stock) {
      return false;
    }


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


    if (
      price >
      balance
    ) {

      return false;

    }


    const nextInvestment =
      stock.investment +
      price;


    // ========================================
    // INDIVIDUAL STOCK LIMIT
    // ========================================

    let stockLimit =
      NORMAL_MAX_STOCK;


    // Small budget logic.
    //
    // Agar stock ka first share 20% se
    // thoda zyada hai, maximum 25% tak
    // allow kiya ja sakta hai.
    //
    // Isse AXISBANK / RELIANCE jaise stocks
    // completely ignore nahi honge.
    // ========================================

    if (
      stock.investment === 0 &&
      price <=
      budget *
      SMALL_BUDGET_MAX_STOCK
    ) {

      stockLimit =
        SMALL_BUDGET_MAX_STOCK;

    }


    // Seed phase mein diversification ke
    // liye same stock ko repeatedly nahi lena.
    if (
      seedMode &&
      stock.investment > 0
    ) {

      return false;

    }


    const maxInvestment =
      Math.min(
        budget *
        HARD_MAX_STOCK,

        budget *
        stockLimit
      );


    if (
      nextInvestment >
      maxInvestment + 0.000001
    ) {

      return false;

    }


    // ========================================
    // SECTOR LIMIT
    // ========================================

    const sector =
      stock.sector ||
      "Nifty 50";


    const sectorTotals =
      getSectorTotals(
        selected
      );


    const nextSector =
      (
        sectorTotals[sector] ||
        0
      ) +
      price;


    if (
      nextSector >
      budget *
      MAX_SECTOR_ALLOCATION +
      0.000001
    ) {

      return false;

    }


    // ========================================
    // GROUP LIMIT
    // ========================================

    const group =
      stock.businessGroup ||
      stock.symbol;


    const groupTotals =
      getGroupTotals(
        selected
      );


    const nextGroup =
      (
        groupTotals[group] ||
        0
      ) +
      price;


    if (
      nextGroup >
      budget *
      MAX_GROUP_ALLOCATION +
      0.000001
    ) {

      return false;

    }


    return true;

  }


  // ==========================================
  // V3 ALLOCATION SCORE
  // ==========================================

  function calculateV3Score(
    stock,
    selected,
    budget,
    balance,
    total
  ) {

    const target =
      Math.max(
        stock.targetAmount,
        1
      );


    const current =
      stock.investment;


    const gap =
      Math.max(
        0,
        target -
        current
      );


    const gapRatio =
      Math.min(
        2,
        gap /
        target
      );


    // ========================================
    // RANK PRIORITY
    // ========================================

    const rankPriority =
      (
        stock.rankWeight /
        Math.max(
          selected.length,
          1
        )
      );


    // ========================================
    // MOMENTUM
    // ========================================

    const momentum =
      Math.max(
        -3,
        Math.min(
          3,
          stock.change
        )
      );


    // ========================================
    // SECTOR BALANCE
    // ========================================

    const sector =
      stock.sector ||
      "Nifty 50";


    const group =
      stock.businessGroup ||
      stock.symbol;


    const sectorTotals =
      getSectorTotals(
        selected
      );


    const groupTotals =
      getGroupTotals(
        selected
      );


    const sectorRatio =
      (
        sectorTotals[sector] ||
        0
      ) /
      Math.max(
        budget,
        1
      );


    const groupRatio =
      (
        groupTotals[group] ||
        0
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


    // ========================================
    // PRICE EFFICIENCY
    //
    // Cheap share ko blindly priority nahi.
    // But affordable share gets useful bonus.
    // ========================================

    const priceRatio =
      stock.price /
      Math.max(
        budget,
        1
      );


    const affordability =
      Math.max(
        0,
        1 -
        priceRatio
      );


    // ========================================
    // NEW STOCK BONUS
    // ========================================

    const newStockBonus =
      stock.investment === 0
        ? 1
        : 0;


    // ========================================
    // CASH UTILIZATION BONUS
    //
    // Agar share lene ke baad balance
    // bahut kam bachega, extra bonus.
    // ========================================

    const remainingAfter =
      balance -
      stock.price;


    const utilizationBonus =
      remainingAfter >= 0 &&
      remainingAfter <=
        Math.max(
          100,
          budget * 0.03
        )
        ? 1
        : 0;


    // ========================================
    // FINAL SCORE
    // ========================================

    return (

      gapRatio * 5

      +

      rankPriority * 2.5

      +

      diversification * 1.8

      +

      affordability * 0.8

      +

      newStockBonus * 1.2

      +

      utilizationBonus * 2

      +

      momentum * 0.25

    );

  }


  // ==========================================
  // CHOOSE BEST CANDIDATE
  // ==========================================

  function chooseBestCandidate(
    candidates,
    balance,
    selected,
    budget
  ) {

    if (!candidates.length) {
      return null;
    }


    // ========================================
    // If remaining money is small, prioritize
    // a share which uses most of it without
    // violating diversification.
    // ========================================

    const affordable =
      candidates.filter(
        function (item) {

          return (
            item.stock.price <=
            balance
          );

        }
      );


    if (!affordable.length) {
      return null;
    }


    let best =
      affordable[0];


    let bestCombined =
      -Infinity;


    affordable.forEach(
      function (item) {

        const stock =
          item.stock;


        const remaining =
          balance -
          stock.price;


        const utilization =
          balance > 0
            ? (
                stock.price /
                balance
              )
            : 0;


        const sector =
          stock.sector ||
          "Nifty 50";


        const group =
          stock.businessGroup ||
          stock.symbol;


        const sectorTotal =
          (
            getSectorTotals(
              selected
            )[sector] || 0
          );


        const groupTotal =
          (
            getGroupTotals(
              selected
            )[group] || 0
          );


        const sectorRatio =
          sectorTotal /
          Math.max(
            budget,
            1
          );


        const groupRatio =
          groupTotal /
          Math.max(
            budget,
            1
          );


        const balancePenalty =
          remaining /
          Math.max(
            budget,
            1
          );


        const combined =
          item.score

          +

          utilization * 1.5

          -

          balancePenalty * 0.5

          -

          sectorRatio * 0.4

          -

          groupRatio * 0.4;


        if (
          combined >
          bestCombined
        ) {

          bestCombined =
            combined;

          best =
            item;

        }

      }
    );


    return best;

  }


  // ==========================================
  // REMAINING BUDGET OPTIMIZER
  //
  // Finds a better combination of affordable
  // whole shares using limited search.
  // ==========================================

  function optimizeRemainingBudget(
    selected,
    budget,
    currentTotal,
    currentBalance
  ) {

    if (
      currentBalance <= 0
    ) {

      return {

        changed: false

      };

    }


    const candidates =
      selected
        .filter(
          function (stock) {

            return (
              stock.price <=
              currentBalance
            );

          }
        )
        .sort(
          function (a, b) {

            return (
              a.price -
              b.price
            );

          }
        )
        .slice(
          0,
          12
        );


    if (!candidates.length) {

      return {

        changed: false

      };

    }


    let best =
      {

        added: [],

        total: 0,

        score: -Infinity

      };


    // ========================================
    // Recursive limited combination search
    // ========================================

    function search(
      index,
      remaining,
      additions,
      addedTotal,
      depth
    ) {

      if (
        depth > 5
      ) {

        evaluate();

        return;

      }


      evaluate();


      for (
        let i = index;
        i < candidates.length;
        i++
      ) {

        const stock =
          candidates[i];


        if (
          stock.price >
          remaining
        ) {

          continue;

        }


        if (
          additions.length >= 5
        ) {

          break;

        }


        // Temporary allocation
        // check.

        if (
          !canTemporaryAdd(
            stock,
            selected,
            budget,
            addedTotal
          )
        ) {

          continue;

        }


        additions.push(
          stock
        );


        search(
          i,
          remaining -
            stock.price,
          additions,
          addedTotal +
            stock.price,
          depth + 1
        );


        additions.pop();

      }


      function evaluate() {

        if (
          addedTotal <= 0
        ) {

          return;

        }


        const utilization =
          addedTotal /
          Math.max(
            currentBalance,
            1
          );


        const score =
          utilization * 100;


        if (
          score >
          best.score
        ) {

          best = {

            added:
              additions.slice(),

            total:
              addedTotal,

            score

          };

        }

      }

    }


    search(
      0,
      currentBalance,
      [],
      0,
      0
    );


    if (
      !best.added.length
    ) {

      return {

        changed: false

      };

    }


    return {

      changed: true,

      added:
        best.added,

      total:
        best.total

    };

  }


  // ==========================================
  // TEMPORARY ADD CHECK
  // ==========================================

  function canTemporaryAdd(
    stock,
    selected,
    budget,
    addedTotal
  ) {

    const simulated =
      selected.map(
        function (item) {

          return {

            ...item,

            investment:
              item.investment,

            quantity:
              item.quantity

          };

        }
      );


    const target =
      simulated.find(
        function (item) {

          return (
            item.symbol ===
            stock.symbol
          );

        }
      );


    if (!target) {
      return false;
    }


    target.investment +=
      stock.price;


    target.quantity +=
      1;


    const total =
      calculateTotalInvestment(
        simulated
      );


    if (
      total >
      budget
    ) {

      return false;

    }


    // Stock limit
    const maxStock =
      budget *
      SMALL_BUDGET_MAX_STOCK;


    if (
      target.investment >
      Math.min(
        budget *
        HARD_MAX_STOCK,
        maxStock
      ) +
      0.000001
    ) {

      return false;

    }


    const sectorTotals =
      getSectorTotals(
        simulated
      );


    const groupTotals =
      getGroupTotals(
        simulated
      );


    const sector =
      target.sector ||
      "Nifty 50";


    const group =
      target.businessGroup ||
      target.symbol;


    if (
      (
        sectorTotals[sector] ||
        0
      ) >
      budget *
      MAX_SECTOR_ALLOCATION +
      0.000001
    ) {

      return false;

    }


    if (
      (
        groupTotals[group] ||
        0
      ) >
      budget *
      MAX_GROUP_ALLOCATION +
      0.000001
    ) {

      return false;

    }


    return true;

  }


  // ==========================================
  // APPLY OPTIMIZATION
  // ==========================================

  function applyOptimization(
    selected,
    optimized
  ) {

    if (
      !optimized ||
      !optimized.added
    ) {

      return;

    }


    optimized.added.forEach(
      function (stock) {

        const target =
          selected.find(
            function (item) {

              return (
                item.symbol ===
                stock.symbol
              );

            }
          );


        if (!target) {
          return;
        }


        target.quantity += 1;

        target.investment +=
          target.price;

      }
    );

  }


  // ==========================================
  // COUNT POSITIVE STOCKS
  // ==========================================

  function countPositiveStocks(
    stocks
  ) {

    return stocks.filter(
      function (stock) {

        return (
          stock.quantity >
          0
        );

      }
    ).length;

  }


  // ==========================================
  // TOTAL INVESTMENT
  // ==========================================

  function calculateTotalInvestment(
    stocks
  ) {

    return stocks.reduce(
      function (sum, stock) {

        return (
          sum +
          Number(
            stock.investment ||
            0
          )
        );

      },
      0
    );

  }


  // ==========================================
  // SECTOR TOTALS
  // ==========================================

  function getSectorTotals(
    stocks
  ) {

    const totals =
      {};


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

    const totals =
      {};


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
  // RECOMMENDATION HTML
  // ==========================================

  function buildRecommendationHTML(
    budget,
    top20,
    result
  ) {

    let html =
      "";


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
        Top 20 Rank-Weighted Smart
        Diversification Plan V3
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
        Rank + Momentum + Diversification
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
      `Normal stock limit:
      <strong>
        ${(NORMAL_MAX_STOCK * 100).toFixed(0)}%
      </strong>
      <br>`;


    html +=
      `Small-budget first-share limit:
      <strong>
        ${(SMALL_BUDGET_MAX_STOCK * 100).toFixed(0)}%
      </strong>
      <br>`;


    html +=
      `Sector limit:
      <strong>
        ${(MAX_SECTOR_ALLOCATION * 100).toFixed(0)}%
      </strong>
      <br>`;


    html +=
      `Group limit:
      <strong>
        ${(MAX_GROUP_ALLOCATION * 100).toFixed(0)}%
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


        const rowStyle =
          stock.quantity > 0
            ? ""
            : "opacity:0.72;";


        html +=
          `<tr
            style="${rowStyle}"
          >`;


        // Rank

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.rank}
          </td>`;


        // Company

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
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
          </td>`;


        // Price

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.price
            )}
          </td>`;


        // Weight

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.rankWeight}
          </td>`;


        // Target %

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.targetPercent.toFixed(2)}%
          </td>`;


        // Target ₹

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.targetAmount
            )}
          </td>`;


        // Shares

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            <strong>
              ${stock.quantity}
            </strong>
          </td>`;


        // Actual ₹

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.investment
            )}
          </td>`;


        // Actual %

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


        // Sector

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${escapeHtml(
              stock.sector
            )}
          </td>`;


        // Sector %

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.sectorPercent.toFixed(2)}%
          </td>`;


        // Group

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${escapeHtml(
              stock.businessGroup
            )}
          </td>`;


        // Group %

        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
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
    // SELECTED STOCK SUMMARY
    // ========================================

    const selectedStocks =
      result.selected.filter(
        function (stock) {

          return (
            stock.quantity >
            0
          );

        }
      );


    html +=
      `<div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >`;


    html +=
      `<strong>
        Selected Stocks
      </strong>
      <br>`;


    if (
      selectedStocks.length
    ) {

      selectedStocks.forEach(
        function (stock) {

          html +=
            `• ${escapeHtml(
              stock.symbol
            )}
            — ${stock.quantity}
            share(s)
            — ₹${formatMoney(
              stock.investment
            )}
            <br>`;

        }
      );

    }

    else {

      html +=
        `No stock could be allocated within
        current safety rules.<br>`;

    }


    html +=
      `</div>`;


    // ========================================
    // ALLOCATION LOGIC
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
        Allocation Logic V3
      </strong>
      <br>`;


    html +=
      `• Current Top 20 live market ranking
      ke basis par calculate kiya gaya hai.
      <br>`;


    html +=
      `• Higher-ranked stocks ko higher
      allocation priority milti hai.
      <br>`;


    html +=
      `• Live percentage change ko momentum
      signal ke roop mein use kiya gaya hai.
      <br>`;


    html +=
      `• Whole shares hi use kiye jaate hain.
      <br>`;


    html +=
      `• Normal individual-stock allocation
      limit <strong>20%</strong> hai.
      <br>`;


    html +=
      `• Small budget mein first share ke liye
      maximum <strong>25%</strong> tak controlled
      exception ho sakta hai.
      <br>`;


    html +=
      `• Hard safety limit
      <strong>35%</strong> se kabhi upar nahi jayegi.
      <br>`;


    html +=
      `• Sector concentration
      <strong>40%</strong> se upar nahi jayegi.
      <br>`;


    html +=
      `• Business-group concentration
      <strong>30%</strong> se upar nahi jayegi.
      <br>`;


    html +=
      `• Pehle portfolio mein useful
      diversification create karne ki koshish
      hoti hai.
      <br>`;


    html +=
      `• Uske baad rank-weighted whole-share
      optimization hota hai.
      <br>`;


    html +=
      `• Remaining balance ke liye limited
      combination optimization bhi run hota hai.
      <br>`;


    html +=
      `• Engine cheap stock ko sirf isliye
      repeatedly select nahi karega ki uska
      price kam hai.
      <br>`;


    html +=
      `• Expensive stocks ko bhi completely
      ignore nahi kiya jayega, jab tak safety
      rules allow karein.
      <br>`;


    html +=
      `• Budget kabhi exceed nahi hoga.
      <br>`;


    html +=
      `• Kuch balance phir bhi bach sakta hai
      agar available whole-share combinations
      safety limits ke andar fit na ho.
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
      ₹${formatMoney(
        budget
      )}
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
      `Top-20 companies considered:
      ${result.top20Count}
      <br>`;


    html +=
      `Selected:
      ${selectedStocks.length}
      stocks
      <br>`;


    html +=
      `Normal stock limit:
      ${(NORMAL_MAX_STOCK * 100).toFixed(0)}%
      <br>`;


    html +=
      `Small-budget first-share limit:
      ${(SMALL_BUDGET_MAX_STOCK * 100).toFixed(0)}%
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
  // MONEY FORMAT
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


  // ==========================================
  // ENGINE READY
  // ==========================================

  console.log(
    "Prototype-1 app.js V3 loaded successfully."
  );

})();
