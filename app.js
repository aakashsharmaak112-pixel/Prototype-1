// ============================================================
// PROTOTYPE-1 — APP ENGINE V11
// MONTHLY TOP-20 + DAILY MONITORING
// STRICT RISK / ALLOCATION VALIDATION
// REPLACEMENT CANDIDATES + WHOLE-SHARE ALLOCATION
// PORTFOLIO TRACKING
// IMPORTANT: Existing quotes.js / fetchMarketData() untouched
// ============================================================

(function () {
  "use strict";

  console.log("Prototype-1 app.js V11 loading...");

  // ==========================================================
  // SETTINGS
  // ==========================================================

  const TARGET_TOP20 = 20;

  const NORMAL_MAX_STOCK = 0.20;

  // IMPORTANT:
  // 25% exception is ONLY for genuinely small budgets.
  const SMALL_BUDGET_THRESHOLD = 20000;
  const SMALL_BUDGET_MAX_STOCK = 0.25;

  const HARD_MAX_STOCK = 0.35;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const MIN_DIVERSIFIED_STOCKS = 5;
  const MAX_SEARCH_ITERATIONS = 20000;
  const REPLACEMENT_POOL_SIZE = 5;

  // ==========================================================
  // STORAGE
  // ==========================================================

  const PORTFOLIO_KEY =
    "prototype1_portfolio_v11";

  const MONTHLY_KEY =
    "prototype1_monthly_top20_v11";

  const DAILY_KEY =
    "prototype1_daily_monitoring_v11";

  const OLD_PORTFOLIO_KEYS = [
    "prototype1_portfolio_v10",
    "prototype1_portfolio_v9",
    "prototype1_portfolio_v8",
    "prototype1_portfolio_v7",
    "prototype1_portfolio_v6",
    "prototype1_portfolio_v5"
  ];

  const OLD_MONTHLY_KEYS = [
    "prototype1_monthly_top20_v10",
    "prototype1_monthly_top20_v9",
    "prototype1_monthly_top20_v8",
    "prototype1_monthly_top20_v7",
    "prototype1_monthly_top20_v6",
    "prototype1_monthly_top20_v5"
  ];

  let isConnecting = false;

  // ==========================================================
  // DOM READY
  // ==========================================================

  document.addEventListener("DOMContentLoaded", function () {
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
    // CONNECT LIVE MARKET DATA
    // ========================================================

    connectButton.addEventListener(
      "click",
      async function () {
        if (isConnecting) return;

        hideError();

        const totp =
          String(
            totpInput.value || ""
          ).trim();

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

          setMarketStatus(
            "ERROR",
            "status-error"
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
          // IMPORTANT:
          // Existing quotes.js flow is untouched.
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
              (
                window.MARKET_DATA || {}
              ).received || 0
            );

          const requested =
            Number(
              (
                window.MARKET_DATA || {}
              ).requested || 50
            );

          const validStocks =
            getStocksFromMarketData()
              .map(normalizeStock)
              .filter(isValidStock);

          if (
            validStocks.length <
            TARGET_TOP20
          ) {
            showError(
              `Live market data incomplete hai. ${validStocks.length}/${TARGET_TOP20} valid stocks received.`
            );

            setMarketStatus(
              `ERROR • ${validStocks.length}/${requested}`,
              "status-error"
            );

            return;
          }

          setMarketStatus(
            `LIVE • ${
              received ||
              validStocks.length
            }/${requested}`,
            "status-ready"
          );

          renderTop20();

          const monitoring =
            runMonitoring();

          recommendation.innerHTML = `
            <div>
              <strong>
                Live market data connected successfully. ✅
              </strong>
              <br>
              ${
                received ||
                validStocks.length
              }/${requested} stocks received.
              <br><br>
              Monthly Top-20:
              <strong>
                ${monitoring.monthlyTop20.length}
              </strong>
              <br>
              Daily Monitoring:
              <strong>ACTIVE</strong>
            </div>
          `;
        } catch (error) {
          console.error(
            "Prototype-1 connect error:",
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

            saveInvestmentPlan(
              result
            );
          } else {
            recommendation.innerHTML =
              result &&
              result.message
                ? result.message
                : "Investment analysis available nahi hai.";
          }
        } catch (error) {
          console.error(
            "Investment analysis error:",
            error
          );

          recommendation.innerHTML = `
            <div>
              <strong>
                ⚠️ Investment analysis error
              </strong>
              <br>
              ${escapeHtml(
                error &&
                error.message
                  ? error.message
                  : "Investment analysis mein error aaya."
              )}
            </div>
          `;
        }
      }
    );

    // ========================================================
    // ENTER KEY SUPPORT
    // ========================================================

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

    // ========================================================
    // INITIAL RENDER
    // ========================================================

    try {
      if (
        window.MARKET_DATA &&
        window.MARKET_DATA.success
      ) {
        const stocks =
          getStocksFromMarketData()
            .map(normalizeStock)
            .filter(isValidStock);

        if (
          stocks.length >=
          TARGET_TOP20
        ) {
          renderTop20();
          runMonitoring();
        }
      }
    } catch (error) {
      console.warn(
        "Initial V11 render skipped:",
        error
      );
    }
  });

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

      if (
        stocks.length <
        TARGET_TOP20
      ) {
        return {
          success: false,
          message:
            `Live market data incomplete hai. ${stocks.length}/${TARGET_TOP20} valid stocks received.`
        };
      }

      const ranked =
        smartRankStocks(stocks);

      // Monthly baseline is PRIMARY.
      const baseline =
        establishMonthlyBaseline(
          ranked
        );

      // Daily monitoring independent.
      const monitoring =
        runMonitoring();

      const bySymbol =
        new Map(
          ranked.map(
            stock => [
              normalizeSymbol(
                stock.symbol
              ),
              stock
            ]
          )
        );

      const decisionStocks =
        (baseline.top20 || [])
          .map(
            function (item, index) {
              const symbol =
                normalizeSymbol(
                  item.symbol
                );

              const stock =
                bySymbol.get(symbol);

              if (!stock) {
                return null;
              }

              const monitor =
                monitoring.monitored.find(
                  x =>
                    normalizeSymbol(
                      x.symbol
                    ) === symbol
                );

              // EXIT REVIEW is not a fresh BUY candidate.
              if (
                monitor &&
                monitor.status ===
                  "EXIT REVIEW"
              ) {
                return null;
              }

              return {
                ...stock,

                monthlyRank:
                  Number(
                    item.baselineRank
                  ) ||
                  index + 1,

                rank:
                  Number(
                    item.baselineRank
                  ) ||
                  index + 1
              };
            }
          )
          .filter(Boolean);

      if (
        !decisionStocks.length
      ) {
        return {
          success: false,
          message:
            "Monthly Top-20 mein fresh investment ke liye valid candidates available nahi hain."
        };
      }

      const result =
        buildSmartDiversifiedPlan(
          decisionStocks,
          amount
        );

      return {
        success: true,

        budget:
          amount,

        html:
          buildRecommendationHTML(
            amount,
            decisionStocks,
            result
          ) +
          buildMonitoringHTML(
            monitoring
          ),

        selectedStocks:
          result.selected.filter(
            stock =>
              stock.quantity > 0
          ),

        totalInvestment:
          result.totalInvestment,

        balance:
          result.balance,

        top20:
          decisionStocks,

        monthlyTop20:
          baseline.top20,

        monitoring
      };
    };

  // ==========================================================
  // MARKET DATA
  // ==========================================================

  function getStocksFromMarketData() {
    const market =
      window.MARKET_DATA;

    if (!market) {
      return [];
    }

    let source =
      market.stocks;

    if (
      !source &&
      Array.isArray(market)
    ) {
      source = market;
    }

    if (
      !source &&
      Array.isArray(market.data)
    ) {
      source = market.data;
    }

    if (
      !source &&
      market.data &&
      Array.isArray(
        market.data.stocks
      )
    ) {
      source =
        market.data.stocks;
    }

    if (Array.isArray(source)) {
      return source.map(
        item => item || {}
      );
    }

    if (
      !source ||
      typeof source !==
        "object"
    ) {
      return [];
    }

    return Object.keys(source)
      .map(
        function (key) {
          const item =
            source[key] || {};

          return {
            ...item,

            symbol:
              item.symbol ||
              item.neoSymbol ||
              item.tradingsymbol ||
              item.ticker ||
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
              item.changePercent ??
              item.pChange ??
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
  // NORMALIZATION
  // ==========================================================

  function normalizeStock(
    stock
  ) {
    stock =
      stock || {};

    const symbol =
      normalizeSymbol(
        stock.symbol ||
        stock.neoSymbol ||
        stock.displaySymbol ||
        stock.tradingsymbol ||
        stock.ticker ||
        ""
      );

    const master =
      findNiftyStock(symbol);

    return {
      ...stock,

      symbol,

      name:
        String(
          stock.name ||
          stock.companyName ||
          (master &&
            master.name) ||
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
          stock.changePercent ??
          stock.pChange ??
          0
        ),

      chartScore:
        Number(
          stock.chartScore ??
          stock.technicalScore ??
          0
        ),

      fundamentalScore:
        Number(
          stock.fundamentalScore ??
          0
        ),

      newsScore:
        Number(
          stock.newsScore ??
          0
        ),

      priority:
        Number(
          stock.priority ??
          (
            master &&
            master.priority
          ) ??
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

    const target =
      normalizeSymbol(symbol);

    for (
      let i = 0;
      i < list.length;
      i++
    ) {
      const item =
        list[i] || {};

      const itemSymbol =
        normalizeSymbol(
          item.symbol ||
          item.tradingsymbol ||
          item.ticker ||
          ""
        );

      if (
        itemSymbol === target
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

      BAJFINV:
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

      LT:
        "Larsen Group",

      LTIM:
        "Larsen Group",

      LTTS:
        "Larsen Group"
    };

    return (
      groups[
        normalizeSymbol(symbol)
      ] ||
      normalizeSymbol(symbol)
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
  // RANKING ENGINE
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

          const liveChange =
            Number(
              stock.change || 0
            );

          const momentumScore =
            Math.max(
              -5,
              Math.min(
                5,
                Number(
                  stock.chartScore ||
                  liveChange
                )
              )
            );

          const priority =
            Number.isFinite(
              Number(
                stock.priority
              )
            )
              ? Number(
                  stock.priority
                )
              : master &&
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

            momentum:
              momentumScore,

            engineScore:
              liveChange +
              momentumScore *
                0.10 +
              priority *
                0.001
          };
        }
      )
      .sort(
        (a, b) =>
          b.engineScore -
          a.engineScore
      )
      .map(
        function (
          stock,
          index
        ) {
          return {
            ...stock,
            dailyRank:
              index + 1
          };
        }
      );
  }

  // ==========================================================
  // TOP 20 UI
  // ==========================================================

  function renderTop20() {
    const list =
      document.getElementById(
        "top20List"
      );

    if (!list) {
      return;
    }

    const ranked =
      smartRankStocks(
        getStocksFromMarketData()
          .map(normalizeStock)
          .filter(isValidStock)
      );

    const top20 =
      ranked.slice(
        0,
        TARGET_TOP20
      );

    if (!top20.length) {
      list.innerHTML =
        '<p class="note">Live market data available nahi hai.</p>';
      return;
    }

    const fragment =
      document.createDocumentFragment();

    top20.forEach(
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

    renderWatchlist(
      ranked
    );
  }

  // ==========================================================
  // WATCHLIST
  // ==========================================================

  function renderWatchlist(
    ranked
  ) {
    const element =
      document.getElementById(
        "watchlist"
      );

    if (!element) {
      return;
    }

    const candidates =
      ranked
        .filter(
          stock =>
            stock.dailyRank >
            TARGET_TOP20
        )
        .slice(
          0,
          3
        );

    if (!candidates.length) {
      element.innerHTML =
        "<div>No additional WATCH candidates.</div>";
      return;
    }

    element.innerHTML =
      candidates
        .map(
          function (stock) {
            return `
              <div>
                <strong>
                  ${escapeHtml(
                    stock.name
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    stock.sector
                  )}
                </span>

                <b>
                  WATCH
                </b>
              </div>
            `;
          }
        )
        .join("");
  }

  // ==========================================================
  // INDIVIDUAL STOCK LIMIT
  // ==========================================================

  function getIndividualStockLimit(
    budget
  ) {
    // IMPORTANT V11:
    // ₹50,000 portfolio gets strict 20%.
    // 25% exception is only for budgets below ₹20,000.
    const limit =
      budget <
      SMALL_BUDGET_THRESHOLD
        ? SMALL_BUDGET_MAX_STOCK
        : NORMAL_MAX_STOCK;

    return Math.min(
      HARD_MAX_STOCK,
      limit
    );
  }

  // ==========================================================
  // SMART WHOLE-SHARE ALLOCATION
  // ==========================================================

  function buildSmartDiversifiedPlan(
    stocks,
    budget
  ) {
    const count =
      stocks.length;

    const rankWeights =
      stocks.map(
        function (
          stock,
          index
        ) {
          return {
            symbol:
              stock.symbol,

            rank:
              Number(
                stock.monthlyRank ||
                stock.rank ||
                index + 1
              ),

            weight:
              count - index
          };
        }
      );

    const weightTotal =
      rankWeights.reduce(
        function (
          sum,
          item
        ) {
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
        targets[
          item.symbol
        ] =
          item.weight /
          weightTotal;
      }
    );

    const selected =
      stocks.map(
        function (
          stock,
          index
        ) {
          const targetPercent =
            targets[
              stock.symbol
            ] || 0;

          return {
            ...stock,

            rank:
              Number(
                stock.monthlyRank ||
                stock.rank ||
                index + 1
              ),

            rankWeight:
              rankWeights[
                index
              ].weight,

            targetPercent:
              targetPercent *
              100,

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

    let total = 0;

    let balance =
      budget;

    // --------------------------------------------------------
    // PASS 1 — minimum diversification
    // --------------------------------------------------------

    const seedCandidates =
      selected
        .filter(
          stock =>
            stock.price <=
            balance
        )
        .map(
          stock => ({
            stock,

            score:
              seedScore(
                stock,
                selected,
                budget
              )
          })
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
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
        Math.min(
          MIN_DIVERSIFIED_STOCKS,
          selected.length
        )
      ) {
        break;
      }

      const stock =
        seedCandidates[
          i
        ].stock;

      const sector =
        stock.sector ||
        "Nifty 50";

      const group =
        stock.businessGroup ||
        stock.symbol;

      if (
        usedSectors[
          sector
        ] &&
        usedGroups[
          group
        ]
      ) {
        continue;
      }

      if (
        !canAddShare(
          stock,
          selected,
          budget,
          balance,
          true
        )
      ) {
        continue;
      }

      stock.quantity = 1;

      stock.investment =
        stock.price;

      total +=
        stock.price;

      balance =
        Math.max(
          0,
          budget - total
        );

      usedSectors[
        sector
      ] = true;

      usedGroups[
        group
      ] = true;
    }

    // --------------------------------------------------------
    // PASS 2 — smart whole-share allocation
    // --------------------------------------------------------

    let guard = 0;

    while (
      balance > 0 &&
      guard <
        MAX_SEARCH_ITERATIONS
    ) {
      guard++;

      const candidates =
        selected
          .filter(
            stock =>
              canAddShare(
                stock,
                selected,
                budget,
                balance,
                false
              )
          )
          .map(
            stock => ({
              stock,

              score:
                calculateAllocationScore(
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
        !candidates.length
      ) {
        break;
      }

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

      best.stock.quantity += 1;

      best.stock.investment +=
        best.stock.price;

      total +=
        best.stock.price;

      balance =
        Math.max(
          0,
          budget - total
        );
    }

    calculateConcentration(
      selected,
      total
    );

    selected.forEach(
      function (stock) {
        stock.targetGap =
          stock.targetAmount -
          stock.investment;

        stock.allocationLimitPercent =
          getIndividualStockLimit(
            budget
          ) * 100;
      }
    );

    // FINAL SAFETY CHECK.
    validatePlan(
      selected,
      budget,
      total
    );

    return {
      selected,

      totalInvestment:
        total,

      balance,

      top20Count:
        count,

      individualLimitPercent:
        getIndividualStockLimit(
          budget
        ) * 100,

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

  // ==========================================================
  // SEED SCORE
  // ==========================================================

  function seedScore(
    stock,
    selected,
    budget
  ) {
    const rankScore =
      stock.rankWeight /
      Math.max(
        selected.length,
        1
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

    return (
      rankScore * 5 +
      momentum * 0.4 +
      (
        1 -
        stock.price /
          Math.max(
            budget,
            1
          )
      ) * 2 +
      (
        1 -
        sectorExisting /
          Math.max(
            budget,
            1
          )
      ) * 2 +
      (
        1 -
        groupExisting /
          Math.max(
            budget,
            1
          )
      ) * 2
    );
  }

  // ==========================================================
  // CAN ADD SHARE
  // ==========================================================

  function canAddShare(
    stock,
    selected,
    budget,
    balance,
    seedMode
  ) {
    if (
      !stock ||
      !Number.isFinite(
        stock.price
      ) ||
      stock.price <= 0
    ) {
      return false;
    }

    if (
      stock.price >
      balance +
      0.000001
    ) {
      return false;
    }

    if (
      seedMode &&
      stock.investment > 0
    ) {
      return false;
    }

    const individualLimit =
      getIndividualStockLimit(
        budget
      );

    const maxInvestment =
      individualLimit *
      budget;

    const nextInvestment =
      stock.investment +
      stock.price;

    // Strict individual stock limit.
    if (
      nextInvestment >
      maxInvestment +
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

    const nextSector =
      (
        getSectorTotals(
          selected
        )[sector] || 0
      ) +
      stock.price;

    const nextGroup =
      (
        getGroupTotals(
          selected
        )[group] || 0
      ) +
      stock.price;

    if (
      nextSector >
      budget *
        MAX_SECTOR_ALLOCATION +
        0.000001
    ) {
      return false;
    }

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

  // ==========================================================
  // ALLOCATION SCORE
  // ==========================================================

  function calculateAllocationScore(
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

    const gapRatio =
      Math.min(
        2,
        gap /
        target
      );

    const rankPriority =
      stock.rankWeight /
      Math.max(
        selected.length,
        1
      );

    const momentum =
      Math.max(
        -3,
        Math.min(
          3,
          stock.change
        )
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
      (1 - sectorRatio) +
      (1 - groupRatio);

    const affordability =
      Math.max(
        0,
        1 -
        stock.price /
        Math.max(
          budget,
          1
        )
      );

    const newStockBonus =
      stock.investment === 0
        ? 1
        : 0;

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

    return (
      gapRatio * 5 +
      rankPriority * 2.5 +
      diversification * 1.8 +
      affordability * 0.8 +
      newStockBonus * 1.2 +
      utilizationBonus * 2 +
      momentum * 0.25
    );
  }

  // ==========================================================
  // BEST CANDIDATE
  // ==========================================================

  function chooseBestCandidate(
    candidates,
    balance,
    selected,
    budget
  ) {
    if (
      !candidates.length
    ) {
      return null;
    }

    let best = null;
    let bestCombined =
      -Infinity;

    candidates.forEach(
      function (item) {
        const stock =
          item.stock;

        const remaining =
          balance -
          stock.price;

        const utilization =
          balance > 0
            ? stock.price /
              balance
            : 0;

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

        const combined =
          item.score +
          utilization *
            1.5 -
          (
            remaining /
            Math.max(
              budget,
              1
            )
          ) *
            0.5 -
          sectorRatio *
            0.4 -
          groupRatio *
            0.4;

        if (
          combined >
          bestCombined
        ) {
          bestCombined =
            combined;

          best = item;
        }
      }
    );

    return best;
  }

  // ==========================================================
  // FINAL PLAN VALIDATION
  // ==========================================================

  function validatePlan(
    stocks,
    budget,
    total
  ) {
    if (
      total >
      budget +
      0.000001
    ) {
      throw new Error(
        "Safety validation failed: investment budget exceeded."
      );
    }

    const individualLimit =
      getIndividualStockLimit(
        budget
      );

    const maxStockAmount =
      individualLimit *
      budget;

    for (
      const stock of stocks
    ) {
      if (
        stock.investment >
        maxStockAmount +
        0.000001
      ) {
        throw new Error(
          `${stock.symbol} allocation exceeds ${(
            individualLimit * 100
          ).toFixed(0)}% individual-stock limit.`
        );
      }
    }

    const sectors =
      getSectorTotals(
        stocks
      );

    const groups =
      getGroupTotals(
        stocks
      );

    Object.keys(
      sectors
    ).forEach(
      function (key) {
        if (
          sectors[key] >
          budget *
            MAX_SECTOR_ALLOCATION +
            0.000001
        ) {
          throw new Error(
            `Sector allocation safety limit exceeded: ${key}.`
          );
        }
      }
    );

    Object.keys(
      groups
    ).forEach(
      function (key) {
        if (
          groups[key] >
          budget *
            MAX_GROUP_ALLOCATION +
            0.000001
        ) {
          throw new Error(
            `Business-group allocation safety limit exceeded: ${key}.`
          );
        }
      }
    );
  }

  // ==========================================================
  // TOTALS
  // ==========================================================

  function countPositiveStocks(
    stocks
  ) {
    return stocks.filter(
      stock =>
        stock.quantity >
        0
    ).length;
  }

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
      function (stock) {
        const sector =
          stock.sector ||
          "Nifty 50";

        const group =
          stock.businessGroup ||
          stock.symbol;

        stock.actualPercent =
          total > 0
            ? (
                stock.investment /
                total
              ) * 100
            : 0;

        stock.sectorPercent =
          total > 0
            ? (
                (
                  sectors[
                    sector
                  ] || 0
                ) /
                total
              ) * 100
            : 0;

        stock.groupPercent =
          total > 0
            ? (
                (
                  groups[
                    group
                  ] || 0
                ) /
                total
              ) * 100
            : 0;
      }
    );
  }

  // ==========================================================
  // DATE / SYMBOL
  // ==========================================================

  function monthKey() {
    const d =
      new Date();

    return (
      `${d.getFullYear()}-` +
      `${String(
        d.getMonth() + 1
      ).padStart(
        2,
        "0"
      )}`
    );
  }

  function todayKey() {
    const d =
      new Date();

    return (
      `${d.getFullYear()}-` +
      `${String(
        d.getMonth() + 1
      ).padStart(
        2,
        "0"
      )}-` +
      `${String(
        d.getDate()
      ).padStart(
        2,
        "0"
      )}`
    );
  }

  function normalizeSymbol(
    symbol
  ) {
    return String(
      symbol || ""
    )
      .replace(
        /-EQ$/i,
        ""
      )
      .trim()
      .toUpperCase();
  }

  // ==========================================================
  // MONTHLY MEMORY
  // ==========================================================

  function normalizeMonthlyMemory(
    record
  ) {
    if (
      !record ||
      typeof record !==
        "object"
    ) {
      return null;
    }

    const month =
      record.month;

    let top20 =
      Array.isArray(
        record.top20
      )
        ? record.top20
        : Array.isArray(
            record.symbols
          )
          ? record.symbols.map(
              symbol => ({
                symbol
              })
            )
          : [];

    top20 =
      top20
        .map(
          function (
            item,
            index
          ) {
            if (
              typeof item ===
              "string"
            ) {
              return {
                symbol:
                  normalizeSymbol(
                    item
                  ),

                baselineRank:
                  index + 1
              };
            }

            return {
              symbol:
                normalizeSymbol(
                  item &&
                  (
                    item.symbol ||
                    item.neoSymbol ||
                    item.displaySymbol
                  )
                ),

              name:
                item &&
                item.name,

              baselineRank:
                Number(
                  item &&
                  item.baselineRank
                ) ||
                index + 1,

              baselinePrice:
                Number(
                  item &&
                  item.baselinePrice
                ) ||
                0
            };
          }
        )
        .filter(
          item =>
            item.symbol
        )
        .slice(
          0,
          TARGET_TOP20
        );

    if (
      !month ||
      top20.length !==
      TARGET_TOP20
    ) {
      return null;
    }

    return {
      month,

      createdAt:
        record.createdAt ||
        new Date().toISOString(),

      updatedAt:
        record.updatedAt ||
        new Date().toISOString(),

      top20,

      source:
        record.source ||
        "existing"
    };
  }

  function establishMonthlyBaseline(
    ranked
  ) {
    const key =
      monthKey();

    const current =
      loadJSON(
        MONTHLY_KEY,
        {}
      );

    let baseline =
      current &&
      current[key]
        ? normalizeMonthlyMemory(
            current[key]
          )
        : null;

    // Migrate older monthly memory.
    if (!baseline) {
      for (
        const oldKey of
        OLD_MONTHLY_KEYS
      ) {
        const oldStore =
          loadJSON(
            oldKey,
            null
          );

        const candidate =
          oldStore &&
          oldStore[key]
            ? oldStore[key]
            : oldStore;

        const normalized =
          normalizeMonthlyMemory(
            candidate
          );

        if (
          normalized &&
          normalized.month ===
          key
        ) {
          baseline = {
            ...normalized,

            updatedAt:
              new Date().toISOString(),

            source:
              "migrated_to_v11"
          };

          break;
        }
      }
    }

    // New month gets one initial snapshot.
    if (!baseline) {
      baseline = {
        month: key,

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),

        source:
          "new_month_snapshot",

        top20:
          ranked
            .slice(
              0,
              TARGET_TOP20
            )
            .map(
              function (
                stock,
                index
              ) {
                return {
                  symbol:
                    stock.symbol,

                  name:
                    stock.name,

                  baselineRank:
                    index + 1,

                  baselinePrice:
                    stock.price
                };
              }
            )
      };
    }

    // Existing snapshot is preserved.
    const store =
      current &&
      typeof current ===
      "object" &&
      !Array.isArray(
        current
      )
        ? current
        : {};

    store[key] =
      baseline;

    saveJSON(
      MONTHLY_KEY,
      store
    );

    return baseline;
  }

  // ==========================================================
  // DAILY MONITORING
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

        message:
          "Live market data available nahi hai."
      };
    }

    const baseline =
      establishMonthlyBaseline(
        stocks
      );

    const monthlyTop20 =
      (baseline.top20 || [])
        .map(
          item =>
            normalizeSymbol(
              item.symbol
            )
        );

    const monitored =
      stocks.map(
        function (
          stock,
          index
        ) {
          const dailyRank =
            index + 1;

          const symbol =
            normalizeSymbol(
              stock.symbol
            );

          const monthly =
            monthlyTop20.includes(
              symbol
            );

          const old =
            (
              baseline.top20 ||
              []
            ).find(
              item =>
                normalizeSymbol(
                  item.symbol
                ) ===
                symbol
            );

          let status =
            "WATCH";

          let reason =
            "Daily ranking monitor ho rahi hai; monthly decision unchanged hai.";

          if (monthly) {
            if (
              dailyRank > 25
            ) {
              status =
                "EXIT REVIEW";

              reason =
                "Monthly Top-20 holding ki daily ranking significantly weak hui hai; detailed review required.";
            } else if (
              dailyRank > 20
            ) {
              status =
                "WATCH";

              reason =
                "Daily ranking Top-20 se bahar hai; automatic exit nahi hoga.";
            } else if (
              old &&
              dailyRank <
              Number(
                old.baselineRank ||
                999
              )
            ) {
              status =
                "IMPROVING";

              reason =
                "Monthly baseline ke comparison mein ranking improve hui hai.";
            } else {
              status =
                "HOLD";

              reason =
                "Monthly Top-20 mein hai; daily fluctuation se automatic exit nahi.";
            }
          } else if (
            dailyRank <=
            TARGET_TOP20
          ) {
            status =
              "IMPROVING";

            reason =
              "Current daily Top-20 mein improve hua hai; next monthly review candidate.";
          } else if (
            dailyRank <=
            25
          ) {
            status =
              "WATCH";

            reason =
              "Top-20 ke close hai; improvement monitor ki jayegi.";
          }

          return {
            symbol:
              stock.symbol,

            name:
              stock.name,

            dailyRank,

            price:
              stock.price,

            change:
              stock.change,

            monthlyTop20:
              monthly,

            baselineRank:
              old
                ? old.baselineRank
                : null,

            status,

            reason,

            research:
              getResearchSignals(
                stock
              )
          };
        }
      );

    const replacementCandidates =
      monitored
        .filter(
          item =>
            !item.monthlyTop20 &&
            (
              item.status ===
              "IMPROVING" ||
              item.status ===
              "WATCH"
            )
        )
        .sort(
          (a, b) =>
            a.dailyRank -
            b.dailyRank
        )
        .slice(
          0,
          REPLACEMENT_POOL_SIZE
        );

    const result = {
      success: true,

      month:
        monthKey(),

      monthlyTop20,

      monitored,

      replacementCandidates
    };

    saveJSON(
      DAILY_KEY,
      {
        timestamp:
          new Date().toISOString(),

        date:
          todayKey(),

        result
      }
    );

    return result;
  }

  // ==========================================================
  // RESEARCH SIGNALS
  // ==========================================================

  function getResearchSignals(
    stock
  ) {
    return {
      chart:
        Number.isFinite(
          Number(
            stock.chartScore
          )
        )
          ? Number(
              stock.chartScore
            )
          : null,

      fundamental:
        Number.isFinite(
          Number(
            stock.fundamentalScore
          )
        )
          ? Number(
              stock.fundamentalScore
            )
          : null,

      news:
        Number.isFinite(
          Number(
            stock.newsScore
          )
        )
          ? Number(
              stock.newsScore
            )
          : null
    };
  }

  // ==========================================================
  // MONITORING HTML
  // ==========================================================

  function buildMonitoringHTML(
    monitoring
  ) {
    if (
      !monitoring ||
      !monitoring.success
    ) {
      return "";
    }

    let html = `
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
          📊 Monthly Top-20 Monitoring
        </strong>
        <br>
        Daily monitoring active hai.
        Daily fluctuation se monthly investment
        decision automatically change nahi hoga.

        <br><br>
    `;

    monitoring.monitored
      .filter(
        item =>
          item.monthlyTop20 ||
          item.status ===
          "IMPROVING"
      )
      .slice(
        0,
        25
      )
      .forEach(
        function (item) {
          html += `
            <div
              style="
                padding:6px 0;
                border-bottom:1px solid #252d38;
              "
            >
              <strong>
                ${escapeHtml(
                  item.symbol
                )}
              </strong>
              —
              Daily Rank #${
                item.dailyRank
              }
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

    if (
      monitoring
        .replacementCandidates
        .length
    ) {
      html += `
        <div style="margin-top:12px;">
          <strong>
            🔄 Replacement Candidates
          </strong>
          <br>
      `;

      monitoring
        .replacementCandidates
        .forEach(
          function (item) {
            html += `
              •
              ${escapeHtml(
                item.symbol
              )}
              —
              Daily Rank #${
                item.dailyRank
              }
              —
              ${escapeHtml(
                item.status
              )}
              <br>
            `;
          }
        );

      html += `
        </div>
      `;
    }

    html += `
      </div>
    `;

    return html;
  }

  // ==========================================================
  // PORTFOLIO
  // ==========================================================

  function getPortfolio() {
    const empty = {
      createdAt:
        new Date().toISOString(),

      budget:
        0,

      investedBudget:
        0,

      positions:
        {},

      transactions:
        [],

      lastUpdated:
        null
    };

    const current =
      loadJSON(
        PORTFOLIO_KEY,
        null
      );

    if (
      current &&
      typeof current ===
      "object"
    ) {
      return {
        ...empty,
        ...current,

        positions:
          current.positions &&
          typeof current.positions ===
          "object"
            ? current.positions
            : {},

        transactions:
          Array.isArray(
            current.transactions
          )
            ? current.transactions
            : []
      };
    }

    for (
      const key of
      OLD_PORTFOLIO_KEYS
    ) {
      const old =
        loadJSON(
          key,
          null
        );

      if (
        old &&
        typeof old ===
        "object"
      ) {
        const migrated = {
          ...empty,
          ...old,

          migratedFrom:
            key,

          investedBudget:
            Number(
              old.investedBudget ??
              old.budget ??
              0
            ),

          positions:
            old.positions &&
            typeof old.positions ===
            "object"
              ? old.positions
              : {},

          transactions:
            Array.isArray(
              old.transactions
            )
              ? old.transactions
              : [],

          lastUpdated:
            new Date().toISOString()
        };

        saveJSON(
          PORTFOLIO_KEY,
          migrated
        );

        return migrated;
      }
    }

    return empty;
  }

  function savePortfolio(
    portfolio
  ) {
    portfolio.lastUpdated =
      new Date().toISOString();

    saveJSON(
      PORTFOLIO_KEY,
      portfolio
    );
  }

  function saveInvestmentPlan(
    result
  ) {
    if (
      !result ||
      !Array.isArray(
        result.selectedStocks
      )
    ) {
      return null;
    }

    const portfolio =
      getPortfolio();

    const nextPositions = {};

    result.selectedStocks.forEach(
      function (stock) {
        const quantity =
          Number(
            stock.quantity ||
            0
          );

        if (
          quantity <= 0
        ) {
          return;
        }

        const invested =
          Number(
            stock.investment ||
            0
          );

        const symbol =
          normalizeSymbol(
            stock.symbol
          );

        nextPositions[
          symbol
        ] = {
          symbol,

          name:
            stock.name,

          quantity,

          averagePrice:
            invested /
            quantity,

          invested,

          lastPrice:
            Number(
              stock.price ||
              0
            ),

          sector:
            stock.sector ||
            "Nifty 50",

          businessGroup:
            stock.businessGroup ||
            symbol,

          monthlyRank:
            Number(
              stock.monthlyRank ||
              stock.rank ||
              0
            )
        };
      }
    );

    // Replace stale positions with current generated plan.
    portfolio.positions =
      nextPositions;

    portfolio.budget =
      Number(
        result.budget ||
        0
      );

    portfolio.investedBudget =
      Number(
        result.totalInvestment ||
        0
      );

    portfolio.transactions =
      Array.isArray(
        portfolio.transactions
      )
        ? portfolio.transactions
        : [];

    portfolio.transactions.push({
      type:
        "INVESTMENT_PLAN",

      timestamp:
        new Date().toISOString(),

      budget:
        Number(
          result.budget ||
          0
        ),

      invested:
        Number(
          result.totalInvestment ||
          0
        ),

      balance:
        Number(
          result.balance ||
          0
        ),

      symbols:
        Object.keys(
          nextPositions
        )
    });

    if (
      portfolio.transactions.length >
      100
    ) {
      portfolio.transactions =
        portfolio.transactions.slice(
          -100
        );
    }

    savePortfolio(
      portfolio
    );

    return portfolio;
  }

  // ==========================================================
  // PORTFOLIO VALUE
  // ==========================================================

  function calculatePortfolioValue() {
    const portfolio =
      getPortfolio();

    const liveStocks =
      getStocksFromMarketData()
        .map(normalizeStock)
        .filter(isValidStock);

    let invested =
      0;

    let currentValue =
      0;

    Object.keys(
      portfolio.positions ||
      {}
    ).forEach(
      function (symbol) {
        const position =
          portfolio.positions[
            symbol
          ];

        const live =
          liveStocks.find(
            stock =>
              normalizeSymbol(
                stock.symbol
              ) ===
              normalizeSymbol(
                symbol
              )
          );

        const quantity =
          Number(
            position.quantity ||
            0
          );

        const investedAmount =
          Number(
            position.invested ||
            0
          );

        const currentPrice =
          live
            ? Number(
                live.price
              )
            : Number(
                position.lastPrice ||
                0
              );

        invested +=
          investedAmount;

        currentValue +=
          quantity *
          currentPrice;
      }
    );

    return {
      invested,

      currentValue,

      pnl:
        currentValue -
        invested,

      pnlPercent:
        invested > 0
          ? (
              (
                currentValue -
                invested
              ) /
              invested
            ) *
            100
          : 0
    };
  }

  // ==========================================================
  // PORTFOLIO RISK
  // ==========================================================

  function portfolioWarnings() {
    const portfolio =
      getPortfolio();

    const live =
      getStocksFromMarketData()
        .map(normalizeStock)
        .filter(isValidStock);

    const value =
      calculatePortfolioValue();

    const warnings = [];

    if (
      value.currentValue <=
      0
    ) {
      return warnings;
    }

    const budget =
      Number(
        portfolio.budget ||
        value.invested ||
        0
      );

    const maxPercent =
      getIndividualStockLimit(
        budget
      ) *
      100;

    Object.keys(
      portfolio.positions ||
      {}
    ).forEach(
      function (symbol) {
        const position =
          portfolio.positions[
            symbol
          ];

        const stock =
          live.find(
            item =>
              normalizeSymbol(
                item.symbol
              ) ===
              normalizeSymbol(
                symbol
              )
          );

        if (!stock) {
          return;
        }

        const positionValue =
          Number(
            position.quantity ||
            0
          ) *
          Number(
            stock.price ||
            0
          );

        const pct =
          (
            positionValue /
            value.currentValue
          ) *
          100;

        // Same limit as the engine.
        if (
          pct >
          maxPercent +
          0.0001
        ) {
          warnings.push(
            `${symbol} allocation ${pct.toFixed(
              2
            )}% hai — ${maxPercent.toFixed(
              0
            )}% individual-stock limit se upar.`
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
    result
  ) {
    const selected =
      result.selected.filter(
        stock =>
          stock.quantity >
          0
      );

    const limitPercent =
      result.individualLimitPercent;

    let html = `
      <div
        class="investment-summary"
        style="
          padding:14px;
          margin-bottom:14px;
          border-radius:10px;
          background:#111820;
        "
      >
        <div class="investment-title">
          🤖 Prototype-1 V11 —
          Monthly Top-20 Smart Investment Plan
        </div>

        <div
          style="
            line-height:1.8;
            margin-top:8px;
          "
        >
          Budget:
          <strong>
            ₹${formatMoney(
              budget
            )}
          </strong>

          <br>

          Decision Mode:
          <strong>MONTHLY</strong>

          <br>

          Daily Monitoring:
          <strong>ACTIVE</strong>

          <br>

          Monthly Decision Stocks:
          <strong>
            ${top20.length}
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
        </div>
      </div>

      <div
        style="
          overflow-x:auto;
          margin-top:12px;
        "
      >
        <table
          style="
            width:100%;
            border-collapse:collapse;
            min-width:1050px;
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
      function (heading) {
        html += `
          <th
            style="
              text-align:left;
              padding:9px;
              border-bottom:
                1px solid #39424e;
              white-space:nowrap;
            "
          >
            ${heading}
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
            style="${
              stock.quantity > 0
                ? ""
                : "opacity:0.65;"
            }"
          >
            <td style="padding:8px;border-bottom:1px solid #252d38;">
              ${stock.rank}
            </td>

            <td style="padding:8px;border-bottom:1px solid #252d38;">
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

            <td style="padding:8px;border-bottom:1px solid #252d38;">
              ₹${formatMoney(
                stock.price
              )}
            </td>

            <td style="padding:8px;border-bottom:1px solid #252d38;">
              ${stock.targetPercent.toFixed(
                2
              )}%
            </td>

            <td style="padding:8px;border-bottom:1px solid #252d38;">
              ₹${formatMoney(
                stock.targetAmount
              )}
            </td>

            <td style="padding:8px;border-bottom:1px solid #252d38;">
              <strong>
                ${stock.quantity}
              </strong>
            </td>

            <td style="padding:8px;border-bottom:1px solid #252d38;">
              ₹${formatMoney(
                stock.investment
              )}
            </td>

            <td style="padding:8px;border-bottom:1px solid #252d38;">
              ${stock.actualPercent.toFixed(
                2
              )}%
            </td>

            <td style="padding:8px;border-bottom:1px solid #252d38;">
              ${escapeHtml(
                stock.sector
              )}
            </td>

            <td style="padding:8px;border-bottom:1px solid #252d38;">
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
            •
            <strong>
              ${escapeHtml(
                stock.symbol
              )}
            </strong>

            —
            ${stock.quantity}
            share(s)

            —
            ₹${formatMoney(
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
          🧠 V11 Decision Logic
        </strong>

        <br>
        • Monthly Top-20 investment decision ka
        primary reference hai.

        <br>
        • Daily ranking sirf monitoring signal hai.

        <br>
        • Daily fluctuation se automatic BUY/SELL nahi hoga.

        <br>
        • Existing monthly snapshot daily ranking
        se overwrite nahi hogi.

        <br>
        • Strong deterioration par EXIT REVIEW milega.

        <br>
        • EXIT REVIEW stock fresh investment
        plan mein allocate nahi hoga.

        <br>
        • Daily Top-20 improvement next monthly
        review candidate rahega.

        <br>
        • Whole-share allocation use hota hai.

        <br>
        • Current individual-stock limit:
        <strong>
          ${limitPercent.toFixed(0)}%
        </strong>

        <br>
        • Small-budget 25% exception sirf
        ₹${formatMoney(
          SMALL_BUDGET_THRESHOLD
        )}
        se kam budget par active hai.

        <br>
        • Hard safety limit:
        <strong>35%</strong>

        <br>
        • Sector limit:
        <strong>40%</strong>

        <br>
        • Business-group limit:
        <strong>30%</strong>

        <br>
        • Budget kabhi exceed nahi hoga.

        <br>
        • Fake research score generate nahi kiya jayega.

        <br>
        • Available live market data hi use hoga.

        <br>
        • Stale portfolio positions silently carry
        forward nahi hongi.

        <br>
        • Final engine validation allocation rules
        ko dobara verify karti hai.
      </div>

      <div
        style="
          margin-top:14px;
          padding:14px;
          border-top:1px solid #39424e;
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

        <br>

        Individual-stock limit:
        ${limitPercent.toFixed(0)}%

        <br>

        Sector limit:
        40%

        <br>

        Group limit:
        30%
      </div>
    `;

    const valuation =
      calculatePortfolioValue();

    const warnings =
      portfolioWarnings();

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
            valuation.pnl >=
            0
              ? "+"
              : ""
          }
          ₹${formatMoney(
            valuation.pnl
          )}
          (${valuation.pnlPercent.toFixed(
            2
          )}%)
        </strong>
      </div>
    `;

    if (
      warnings.length
    ) {
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
            ⚠️ Portfolio Risk Review
          </strong>
          <br>
      `;

      warnings.forEach(
        function (warning) {
          html +=
            `• ${escapeHtml(
              warning
            )}<br>`;
        }
      );

      html += `
        </div>
      `;
    }

    return html;
  }

  // ==========================================================
  // STORAGE
  // ==========================================================

  function loadJSON(
    key,
    fallback
  ) {
    try {
      const raw =
        localStorage.getItem(
          key
        );

      return raw
        ? JSON.parse(raw)
        : fallback;
    } catch (error) {
      console.error(
        "Storage read error:",
        error
      );

      return fallback;
    }
  }

  function saveJSON(
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
      console.error(
        "Storage save error:",
        error
      );

      return false;
    }
  }

  // ==========================================================
  // STATUS
  // ==========================================================

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
  // FORMATTING
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
  // PUBLIC API
  // ==========================================================

  window.runPrototypeV11Monitoring =
    runMonitoring;

  window.runPrototypeV10Monitoring =
    runMonitoring;

  window.runPrototypeV9Monitoring =
    runMonitoring;

  window.runPrototypeV5Monitoring =
    runMonitoring;

  window.getPrototypeV11Portfolio =
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

  window.getPrototypeV10Portfolio =
    window.getPrototypeV11Portfolio;

  window.getPrototypeV9Portfolio =
    window.getPrototypeV11Portfolio;

  window.savePrototypeV11Investment =
    saveInvestmentPlan;

  window.savePrototypeV10Investment =
    saveInvestmentPlan;

  window.savePrototypeV9Investment =
    saveInvestmentPlan;

  window.savePrototypeV5Investment =
    saveInvestmentPlan;

  window.getPrototypeV11Summary =
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

        holdCount:
          result.monitored.filter(
            x =>
              x.status ===
              "HOLD"
          ).length,

        replacementCount:
          result
            .replacementCandidates
            .length,

        portfolio:
          calculatePortfolioValue(),

        riskWarnings:
          portfolioWarnings()
      };
    };

  window.getPrototypeV10Summary =
    window.getPrototypeV11Summary;

  window.getPrototypeV9Summary =
    window.getPrototypeV11Summary;

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

  console.log(
    "Prototype-1 app.js V11 loaded successfully."
  );
})();
