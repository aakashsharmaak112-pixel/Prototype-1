// ============================================
// PROTOTYPE-1
// MARKET DATA CLIENT - DIAGNOSTIC
// market-data.js
// ============================================

window.MARKET_DATA = window.MARKET_DATA || {
  stocks: {},
  status: "IDLE",
  error: null,
  rawResponse: null
};


// ============================================
// MARKET STATUS
// ============================================

function getMarketStatus() {

  return {
    status:
      window.MARKET_DATA.status,

    stockCount:
      Object.keys(
        window.MARKET_DATA.stocks || {}
      ).length,

    error:
      window.MARKET_DATA.error
  };

}


// ============================================
// EXTRACT QUOTES
// ============================================

function extractQuotes(payload) {

  const candidates = [

    payload,

    payload?.data,

    payload?.data?.data,

    payload?.quotes,

    payload?.data?.quotes

  ];


  for (const value of candidates) {

    if (Array.isArray(value)) {

      return value;

    }

  }


  return [];

}


// ============================================
// NORMALIZE QUOTE
// ============================================

function normalizeQuote(item) {

  const symbol =
    String(

      item?.symbol ||

      item?.tradingSymbol ||

      item?.pTrdSymbol ||

      item?.neoSymbol ||

      ""

    )
      .toUpperCase()
      .replace(/-EQ$/, "");


  const price =
    Number(

      item?.ltp ??

      item?.last_traded_price ??

      item?.lastTradedPrice ??

      item?.price ??

      0

    );


  const change =
    Number(

      item?.change ??

      item?.changePercent ??

      item?.percentChange ??

      0

    );


  return {

    symbol,

    price,

    change,

    raw:
      item

  };

}


// ============================================
// FETCH LIVE MARKET DATA
// ============================================

async function fetchMarketData(totp) {

  window.MARKET_DATA.status =
    "LOADING";

  window.MARKET_DATA.error =
    null;

  window.MARKET_DATA.rawResponse =
    null;


  // ==========================================
  // TOTP CHECK
  // ==========================================

  if (
    !/^\d{6}$/.test(
      String(totp || "").trim()
    )
  ) {

    window.MARKET_DATA.status =
      "ERROR";

    window.MARKET_DATA.error =
      "Current 6-digit TOTP required.";

    return false;

  }


  try {

    // ========================================
    // CALL BACKEND
    // ========================================

    const response =
      await fetch(
        "/api/quotes",
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body:
            JSON.stringify({

              totp:
                String(totp).trim()

            })

        }
      );


    // ========================================
    // READ RESPONSE
    // ========================================

    const text =
      await response.text();


    let data =
      null;


    try {

      data =
        text
          ? JSON.parse(text)
          : null;

    } catch {

      data =
        null;

    }


    window.MARKET_DATA.rawResponse =
      data || text;


    // ========================================
    // API ERROR
    // ========================================

    if (
      !response.ok ||
      !data?.success
    ) {

      const detail =

        data?.error ||

        data?.message ||

        (
          typeof text === "string"
            ? text.slice(0, 1000)
            : "Unknown API error"
        );


      const step =
        data?.step
          ? ` [${data.step}]`
          : "";


      const status =
        data?.status ||
        response.status;


      throw new Error(

        `API /api/quotes${step} HTTP ${status}: ${detail}`

      );

    }


    // ========================================
    // EXTRACT QUOTES
    // ========================================

    const quotes =
      extractQuotes(data);


    const stocks =
      {};


    // ========================================
    // BUILD STOCK DATA
    // ========================================

    for (
      const item of quotes
    ) {

      const q =
        normalizeQuote(item);


      if (q.symbol) {

        stocks[q.symbol] = {

          price:
            q.price,

          change:
            q.change,

          raw:
            q.raw

        };

      }

    }


    window.MARKET_DATA.stocks =
      stocks;


    // ========================================
    // NO STOCK DATA
    // ========================================

    if (
      !Object.keys(stocks).length
    ) {

      throw new Error(

        "API successful hai, lekin quotes array mein usable stock data nahi mila."

      );

    }


    // ========================================
    // SUCCESS
    // ========================================

    window.MARKET_DATA.status =
      "LIVE";


    console.log(

      "Prototype-1 LIVE MARKET DATA:",

      stocks

    );


    return true;


  } catch (error) {

    // ========================================
    // EXACT ERROR
    // ========================================

    window.MARKET_DATA.status =
      "ERROR";


    window.MARKET_DATA.error =
      error?.message ||
      String(error);


    console.error(

      "Prototype-1 MARKET DATA ERROR:",

      {

        message:
          window.MARKET_DATA.error,

        response:
          window.MARKET_DATA.rawResponse

      }

    );


    return false;

  }

}


// ============================================
// BROWSER ACCESS
// ============================================

window.fetchMarketData =
  fetchMarketData;


window.getMarketStatus =
  getMarketStatus;


// ============================================
// STARTUP LOG
// ============================================

console.log(
  "Prototype-1 market-data.js diagnostic loaded."
);
