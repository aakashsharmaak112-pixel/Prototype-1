// ============================================
// PROTOTYPE-1
// APP CONTROLLER
// app.js
// ============================================

(function () {

  "use strict";


  // ==========================================
  // ELEMENT HELPERS
  // ==========================================

  function getElement(id) {

    return document.getElementById(id);

  }


  // ==========================================
  // MARKET STATUS
  // ==========================================

  function setMarketStatus(
    text,
    type
  ) {

    const element =
      getElement("marketStatus");

    if (!element) {
      return;
    }


    element.innerText =
      text;


    element.className =
      type === "ready"
        ? "status-ready"
        : type === "error"
          ? "status-error"
          : "status-pending";

  }


  // ==========================================
  // ERROR
  // ==========================================

  function showAppError(
    message
  ) {

    const box =
      getElement("errorBox");


    if (!box) {
      return;
    }


    box.innerText =
      message || "Unknown error.";


    box.style.display =
      "block";

  }


  function clearAppError() {

    const box =
      getElement("errorBox");


    if (!box) {
      return;
    }


    box.innerText =
      "";


    box.style.display =
      "none";

  }


  // ==========================================
  // ESCAPE HTML
  // ==========================================

  function escapeHtml(
    value
  ) {

    return String(
      value ?? ""
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
  // FORMAT MONEY
  // ==========================================

  function formatMoney(
    value
  ) {

    const number =
      Number(value) || 0;


    return (
      "₹" +
      number.toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );

  }


  // ==========================================
  // DISPLAY TOP 20
  // ==========================================

  function displayTop20(
    stocks
  ) {

    const list =
      getElement("top20List");


    if (!list) {
      return;
    }


    if (
      !Array.isArray(stocks) ||
      stocks.length === 0
    ) {

      list.innerHTML =
        `
        <p class="note">
          Live market data available nahi hai.
        </p>
        `;

      return;

    }


    list.innerHTML =
      "";


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


        const change =
          Number(
            stock.change
          ) || 0;


        const changeClass =
          change >= 0
            ? "positive"
            : "negative";


        const changeText =
          (
            change >= 0
              ? "+"
              : ""
          ) +
          change.toFixed(2) +
          "%";


        row.innerHTML =
          `

          <div class="stock-left">

            <div class="rank">
              ${index + 1}
            </div>

            <div>

              <div class="stock-name">
                ${escapeHtml(
                  stock.name ||
                  stock.symbol
                )}
              </div>

              <div class="stock-sector">
                ${escapeHtml(
                  stock.symbol
                )}
                •
                ${escapeHtml(
                  stock.sector ||
                  "Nifty 50"
                )}
              </div>

            </div>

          </div>

          <div class="stock-change">

            <div class="${changeClass}">
              ${changeText}
            </div>

            <div class="stock-sector">
              ${formatMoney(
                stock.price
              )}
            </div>

          </div>

          `;


        list.appendChild(
          row
        );

      }
    );

  }


  // ==========================================
  // LOAD TOP 20
  // ==========================================

  function loadTop20() {

    if (
      !window.RANKING_ENGINE ||
      typeof
      window.RANKING_ENGINE.calculateTop20 !==
      "function"
    ) {

      console.error(
        "Ranking engine not available."
      );

      setMarketStatus(
        "ENGINE ERROR",
        "error"
      );

      showAppError(
        "ranking-engine.js load nahi hua."
      );

      return [];

    }


    const top20 =
      window.RANKING_ENGINE
        .calculateTop20();


    if (!top20.length) {

      setMarketStatus(
        "NO DATA",
        "error"
      );


      displayTop20([]);


      return [];

    }


    window.TOP_20_STOCKS =
      top20;


    displayTop20(
      top20
    );


    const received =
      Array.isArray(
        window.REAL_MARKET_DATA
      )
        ? window.REAL_MARKET_DATA.length
        : top20.length;


    setMarketStatus(
      `LIVE • ${received}/50`,
      "ready"
    );


    return top20;

  }


  // ==========================================
  // DISPLAY INVESTMENT RESULT
  // ==========================================

  function displayInvestmentResult(
    result
  ) {

    const recommendation =
      getElement(
        "recommendation"
      );


    if (!recommendation) {
      return;
    }


    if (
      !result ||
      !result.success
    ) {

      recommendation.innerText =
        result?.message ||
        "Investment analysis failed.";

      return;

    }


    const data =
      result.data;


    if (!data) {

      recommendation.innerText =
        result.message ||
        "Investment analysis completed.";

      return;

    }


    let html =
      "";


    // ======================================
    // SUMMARY
    // ======================================

    html +=
      `
      <div style="
        margin-bottom:14px;
      ">

        <strong>
          Investment Plan
        </strong>

        <div class="note">
          Amount:
          ${formatMoney(
            data.investmentAmount
          )}
        </div>

        <div class="note">
          Selected Stocks:
          ${data.buyableStocks}
        </div>

        <div class="note">
          Estimated Investment:
          ${formatMoney(
            data.totalInvested
          )}
        </div>

        <div class="note">
          Balance:
          ${formatMoney(
            data.remaining
          )}
        </div>

      </div>
      `;


    // ======================================
    // STOCKS
    // ======================================

    if (
      Array.isArray(
        data.stocks
      ) &&
      data.stocks.length
    ) {

      data.stocks.forEach(
        function (
          stock,
          index
        ) {

          const change =
            Number(
              stock.change
            ) || 0;


          const changeClass =
            change >= 0
              ? "positive"
              : "negative";


          html +=
            `
            <div
              class="stock"
              style="
                display:block;
                padding:12px 0;
              "
            >

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:10px;
                "
              >

                <div>

                  <div class="stock-name">
                    ${index + 1}.
                    ${escapeHtml(
                      stock.name ||
                      stock.symbol
                    )}
                  </div>

                  <div class="stock-sector">
                    ${escapeHtml(
                      stock.symbol
                    )}
                  </div>

                </div>

                <div
                  class="stock-change"
                >

                  <div>
                    ${stock.quantity}
                    share${stock.quantity > 1 ? "s" : ""}
                  </div>

                  <div
                    class="${changeClass}"
                  >
                    ${change >= 0 ? "+" : ""}
                    ${change.toFixed(2)}%
                  </div>

                </div>

              </div>

              <div
                class="note"
                style="
                  margin-top:6px;
                "
              >

                Price:
                ${formatMoney(
                  stock.price
                )}

                &nbsp; • &nbsp;

                Invest:
                ${formatMoney(
                  stock.invested
                )}

              </div>

            </div>
            `;

        }
      );

    }


    // ======================================
    // DISCLAIMER
    // ======================================

    html +=
      `
      <div
        class="note"
        style="
          margin-top:14px;
        "
      >
        ${escapeHtml(
          result.message
        )}
        <br><br>
        Ye calculation live market data
        aur prototype ranking par based hai.
        Investment ka final decision aapka hai.
      </div>
      `;


    recommendation.innerHTML =
      html;

  }


  // ==========================================
  // ANALYZE INVESTMENT
  // ==========================================

  function analyzeInvestment() {

    clearAppError();


    const amountInput =
      getElement("amount");


    const amount =
      Number(
        amountInput?.value
      );


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      showAppError(
        "Please valid investment amount enter karein."
      );


      const recommendation =
        getElement(
          "recommendation"
        );


      if (recommendation) {

        recommendation.innerText =
          "Investment amount enter karke dobara Analyze Investment dabaiye.";

      }


      return;

    }


    // ----------------------------------------
    // Check live data
    // ----------------------------------------

    const liveStocks =
      Array.isArray(
        window.REAL_MARKET_DATA
      )
        ? window.REAL_MARKET_DATA
        : [];


    if (
      liveStocks.length === 0
    ) {

      showAppError(
        "Pehle Connect Live Market Data karke live quotes load karein."
      );


      setMarketStatus(
        "NO DATA",
        "error"
      );


      return;

    }


    // ----------------------------------------
    // Check ranking engine
    // ----------------------------------------

    if (
      !window.RANKING_ENGINE ||
      typeof
      window.RANKING_ENGINE
        .analyzeInvestmentAmount !==
      "function"
    ) {

      showAppError(
        "Investment engine available nahi hai."
      );


      return;

    }


    // ----------------------------------------
    // Run analysis
    // ----------------------------------------

    const analyzeButton =
      getElement(
        "analyzeButton"
      );


    if (analyzeButton) {

      analyzeButton.disabled =
        true;

      analyzeButton.innerText =
        "Calculating...";

    }


    try {

      const result =
        window.RANKING_ENGINE
          .analyzeInvestmentAmount(
            amount
          );


      console.log(
        "Investment analysis result:",
        result
      );


      displayInvestmentResult(
        result
      );

    }

    catch (error) {

      console.error(
        "Investment analysis error:",
        error
      );


      showAppError(
        error?.message ||
        "Investment analysis failed."
      );

    }

    finally {

      if (analyzeButton) {

        analyzeButton.disabled =
          false;

        analyzeButton.innerText =
          "Analyze Investment";

      }

    }

  }


  // ==========================================
  // CONNECT LIVE MARKET DATA
  // ==========================================

  async function connectLiveMarketData() {

    clearAppError();


    const button =
      getElement(
        "connectButton"
      );


    const totpInput =
      getElement(
        "totp"
      );


    const totp =
      String(
        totpInput?.value ||
        ""
      ).trim();


    // ----------------------------------------
    // TOTP validation
    // ----------------------------------------

    if (
      !/^\d{6}$/.test(
        totp
      )
    ) {

      setMarketStatus(
        "TOTP REQUIRED",
        "pending"
      );


      showAppError(
        "Current 6-digit TOTP enter karein."
      );


      totpInput?.focus();


      return;

    }


    // ----------------------------------------
    // fetchMarketData check
    // ----------------------------------------

    if (
      typeof window.fetchMarketData !==
      "function"
    ) {

      setMarketStatus(
        "ENGINE ERROR",
        "error"
      );


      showAppError(
        "market-data.js load nahi hua ya fetchMarketData() available nahi hai."
      );


      return;

    }


    // ----------------------------------------
    // Loading
    // ----------------------------------------

    if (button) {

      button.disabled =
        true;

      button.innerText =
        "Connecting...";

    }


    setMarketStatus(
      "LOADING",
      "pending"
    );


    const list =
      getElement(
        "top20List"
      );


    if (list) {

      list.innerHTML =
        `
        <p class="note">
          Kotak Neo se live market data
          load ho raha hai...
        </p>
        `;

    }


    try {

      const success =
        await window.fetchMarketData(
          totp
        );


      console.log(
        "fetchMarketData result:",
        success
      );


      if (!success) {

        throw new Error(
          "Kotak Neo live market data request failed."
        );

      }


      // --------------------------------------
      // Top 20 rebuild
      // --------------------------------------

      loadTop20();


    }

    catch (error) {

      console.error(
        "Market connection error:",
        error
      );


      setMarketStatus(
        "ERROR",
        "error"
      );


      showAppError(
        error?.message ||
        "Unexpected market data error."
      );

    }

    finally {

      if (button) {

        button.disabled =
          false;

        button.innerText =
          "Connect Live Market Data";

      }

    }

  }


  // ==========================================
  // INITIALIZE APP
  // ==========================================

  function initializeApp() {

    console.log(
      "Prototype-1 app.js loaded."
    );


    const connectButton =
      getElement(
        "connectButton"
      );


    const analyzeButton =
      getElement(
        "analyzeButton"
      );


    // ----------------------------------------
    // Connect button
    // ----------------------------------------

    if (connectButton) {

      connectButton.addEventListener(
        "click",
        connectLiveMarketData
      );

    }


    // ----------------------------------------
    // Analyze button
    // ----------------------------------------

    if (analyzeButton) {

      analyzeButton.addEventListener(
        "click",
        analyzeInvestment
      );

    }


    // ----------------------------------------
    // Stock count
    // ----------------------------------------

    const stockCount =
      getElement(
        "stockCount"
      );


    if (
      stockCount &&
      Array.isArray(
        window.NIFTY_50_STOCKS
      )
    ) {

      stockCount.innerText =
        window.NIFTY_50_STOCKS.length;

    }


    console.log(
      "Prototype-1 app initialized."
    );

  }


  // ==========================================
  // START
  // ==========================================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeApp
    );

  }

  else {

    initializeApp();

  }


})();
