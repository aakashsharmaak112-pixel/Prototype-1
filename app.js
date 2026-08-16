// ============================================
// PROTOTYPE-1
// MAIN APPLICATION ENGINE
// ============================================

(function () {

  "use strict";


  // ==========================================
  // WAIT FOR DOM
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      console.log(
        "Prototype-1 app.js starting..."
      );


      // ========================================
      // ELEMENTS
      // ========================================

      const amountInput =
        document.getElementById(
          "amount"
        );

      const analyzeButton =
        document.getElementById(
          "analyzeButton"
        );

      const connectButton =
        document.getElementById(
          "connectButton"
        );

      const totpInput =
        document.getElementById(
          "totp"
        );

      const marketStatus =
        document.getElementById(
          "marketStatus"
        );

      const stockCount =
        document.getElementById(
          "stockCount"
        );

      const top20List =
        document.getElementById(
          "top20List"
        );

      const recommendation =
        document.getElementById(
          "recommendation"
        );

      const errorBox =
        document.getElementById(
          "errorBox"
        );


      // ========================================
      // HELPERS
      // ========================================

      function setMarketStatus(
        text,
        className
      ) {

        if (!marketStatus) {
          return;
        }

        marketStatus.innerText =
          text;

        marketStatus.className =
          className || "";
      }


      function showError(
        message
      ) {

        if (!errorBox) {
          return;
        }

        errorBox.innerText =
          message || "Unknown error.";

        errorBox.style.display =
          "block";
      }


      function clearError() {

        if (!errorBox) {
          return;
        }

        errorBox.innerText =
          "";

        errorBox.style.display =
          "none";
      }


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


      // ========================================
      // NIFTY 50 COUNT
      // ========================================

      if (
        stockCount &&
        window.NIFTY_50_STOCKS &&
        Array.isArray(
          window.NIFTY_50_STOCKS
        )
      ) {

        stockCount.innerText =
          window.NIFTY_50_STOCKS.length;
      }


      // ========================================
      // BUILD RANKING
      // ========================================

      function buildTop20() {

        if (
          !window.NIFTY_50_STOCKS ||
          !Array.isArray(
            window.NIFTY_50_STOCKS
          )
        ) {

          console.error(
            "NIFTY_50_STOCKS not available."
          );

          return [];
        }


        if (
          !window.MARKET_DATA ||
          !window.MARKET_DATA.stocks
        ) {

          console.error(
            "MARKET_DATA not available."
          );

          return [];
        }


        const liveData =
          window.MARKET_DATA.stocks;


        const rankings = [];


        window.NIFTY_50_STOCKS.forEach(
          function (stock) {

            const symbol =
              String(
                stock.symbol || ""
              )
                .replace(
                  /-EQ$/i,
                  ""
                )
                .trim()
                .toUpperCase();


            if (!symbol) {
              return;
            }


            const liveStock =
              liveData[symbol];


            if (!liveStock) {
              return;
            }


            const price =
              Number(
                liveStock.price ??
                liveStock.ltp ??
                0
              ) || 0;


            if (price <= 0) {
              return;
            }


            const change =
              Number(
                liveStock.change ??
                liveStock.perChange ??
                0
              ) || 0;


            let score =
              change;


            // Use ranking engine when available

            if (
              window.RANKING_ENGINE &&
              typeof
                window.RANKING_ENGINE
                  .calculateScore ===
                "function"
            ) {

              score =
                window.RANKING_ENGINE
                  .calculateScore(
                    liveStock
                  );
            }


            rankings.push({

              symbol:
                symbol,

              name:
                stock.name ||
                symbol,

              sector:
                stock.sector ||
                "Market",

              price:
                price,

              change:
                change,

              score:
                score,

              displaySymbol:
                liveStock.displaySymbol ||
                `${symbol}-EQ`

            });

          }
        );


        rankings.sort(
          function (a, b) {

            return b.score - a.score;

          }
        );


        return rankings.slice(
          0,
          20
        );
      }


      // ========================================
      // DISPLAY TOP 20
      // ========================================

      function displayTop20(
        stocks
      ) {

        if (!top20List) {
          return;
        }


        if (
          !stocks ||
          !stocks.length
        ) {

          top20List.innerHTML =
            `
            <p class="note">
              Live market data received,
              but valid Nifty 50 prices
              were not matched.
            </p>
            `;

          return;
        }


        top20List.innerHTML =
          "";


        stocks.forEach(
          function (stock, index) {

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


            row.innerHTML = `

              <div class="stock-left">

                <div class="rank">
                  ${index + 1}
                </div>

                <div>

                  <div class="stock-name">
                    ${escapeHtml(
                      stock.name
                    )}
                  </div>

                  <div class="stock-sector">
                    ${escapeHtml(
                      stock.symbol
                    )}
                    •
                    ${escapeHtml(
                      stock.sector
                    )}
                  </div>

                </div>

              </div>


              <div class="stock-change">

                <div class="${changeClass}">
                  ${changeText}
                </div>

                <div class="stock-sector">
                  ₹${Number(
                    stock.price
                  ).toLocaleString(
                    "en-IN"
                  )}
                </div>

              </div>

            `;


            top20List.appendChild(
              row
            );

          }
        );
      }


      // ========================================
      // LOAD CURRENT TOP 20
      // ========================================

      function loadTop20() {

        const top20 =
          buildTop20();


        console.log(
          "Calculated Top 20:",
          top20
        );


        if (
          !top20.length
        ) {

          setMarketStatus(
            "NO DATA",
            "status-error"
          );


          displayTop20(
            []
          );

          return;
        }


        setMarketStatus(
          "LIVE",
          "status-ready"
        );


        displayTop20(
          top20
        );


        window.TOP_20_STOCKS =
          top20;


        console.log(
          "Prototype-1 Top 20 ready:",
          top20
        );
      }


      // ========================================
      // CONNECT LIVE MARKET DATA
      // ========================================

      if (
        connectButton
      ) {

        connectButton.addEventListener(
          "click",
          async function () {

            clearError();


            const totp =
              String(
                totpInput?.value ||
                ""
              ).trim();


            // ----------------------------------
            // TOTP VALIDATION
            // ----------------------------------

            if (
              !/^\d{6}$/.test(
                totp
              )
            ) {

              setMarketStatus(
                "TOTP REQUIRED",
                "status-pending"
              );


              if (top20List) {

                top20List.innerHTML =
                  `
                  <p class="note">
                    Current 6-digit TOTP
                    enter karein.
                  </p>
                  `;
              }


              totpInput?.focus();

              return;
            }


            // ----------------------------------
            // CHECK MARKET ENGINE
            // ----------------------------------

            if (
              typeof
                window.fetchMarketData !==
              "function"
            ) {

              setMarketStatus(
                "ENGINE ERROR",
                "status-error"
              );


              showError(
                "market-data.js load nahi hua."
              );

              return;
            }


            connectButton.disabled =
              true;

            connectButton.innerText =
              "Connecting...";


            setMarketStatus(
              "LOADING",
              "status-pending"
            );


            if (top20List) {

              top20List.innerHTML =
                `
                <p class="note">
                  Kotak Neo se live
                  market data load ho raha hai...
                </p>
                `;
            }


            try {

              const success =
                await window.fetchMarketData(
                  totp
                );


              console.log(
                "fetchMarketData:",
                success
              );


              if (!success) {

                throw new Error(
                  "Kotak Neo market data request failed."
                );
              }


              // --------------------------------
              // UPDATE STOCK COUNT
              // --------------------------------

              if (
                stockCount &&
                window.MARKET_DATA
              ) {

                stockCount.innerText =
                  window.MARKET_DATA
                    .totalStocks;
              }


              // --------------------------------
              // BUILD TOP 20
              // --------------------------------

              loadTop20();


              // --------------------------------
              // VERIFY
              // --------------------------------

              const status =
                window.getMarketStatus
                  ? window.getMarketStatus()
                  : null;


              console.log(
                "Market Status:",
                status
              );


              if (
                status &&
                status.stockCount > 0
              ) {

                setMarketStatus(
                  `LIVE • ${status.stockCount}/50`,
                  "status-ready"
                );
              }


            } catch (error) {

              console.error(
                "Market connection error:",
                error
              );


              setMarketStatus(
                "ERROR",
                "status-error"
              );


              if (top20List) {

                top20List.innerHTML =
                  `
                  <p class="note">
                    Kotak Neo live quotes
                    request failed.
                  </p>
                  `;
              }


              showError(
                error.message ||
                "Unexpected connection error."
              );

            } finally {

              connectButton.disabled =
                false;

              connectButton.innerText =
                "Connect Live Market Data";
            }

          }
        );
      }


      // ========================================
      // ANALYZE INVESTMENT
      // ========================================

      if (
        analyzeButton
      ) {

        analyzeButton.addEventListener(
          "click",
          function () {

            clearError();


            const amount =
              Number(
                amountInput?.value
              );


            if (
              !amount ||
              amount <= 0
            ) {

              if (
                recommendation
              ) {

                recommendation.innerText =
                  "Please valid investment amount enter karein.";
              }

              return;
            }


            // ----------------------------------
            // USE EXISTING ANALYSIS ENGINE
            // ----------------------------------

            if (
              typeof
                window.analyzeInvestmentAmount ===
              "function"
            ) {

              try {

                const result =
                  window.analyzeInvestmentAmount(
                    amount
                  );


                if (
                  result &&
                  result.success
                ) {

                  if (
                    recommendation
                  ) {

                    recommendation.innerText =
                      result.message;
                  }

                  return;
                }

              } catch (error) {

                console.error(
                  "Investment analysis error:",
                  error
                );
              }
            }


            // ----------------------------------
            // FALLBACK
            // ----------------------------------

            const top20 =
              window.TOP_20_STOCKS || [];


            if (
              !top20.length
            ) {

              if (
                recommendation
              ) {

                recommendation.innerText =
                  "Pehle “Connect Live Market Data” dabakar live market data load karein.";
              }

              return;
            }


            const usable =
              Math.min(
                5,
                top20.length
              );


            const perStock =
              amount / usable;


            const selected =
              top20.slice(
                0,
                usable
              );


            const names =
              selected
                .map(
                  stock =>
                    stock.symbol
                )
                .join(
                  ", "
                );


            if (
              recommendation
            ) {

              recommendation.innerText =
                `₹${amount.toLocaleString(
                  "en-IN"
                )} ke liye current live ranking ke top ${usable} stocks (${names}) ko analysis mein consider kiya ja sakta hai. Approx ₹${perStock.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 0
                  }
                )} per stock allocation hota.`;
            }

          }
        );
      }


      // ========================================
      // INITIAL ENGINE STATUS
      // ========================================

      if (
        window.MARKET_DATA &&
        window.MARKET_DATA.success
      ) {

        loadTop20();

      }


      console.log(
        "Prototype-1 app.js READY"
      );

    }
  );

})();
