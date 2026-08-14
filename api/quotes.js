// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// SCRIPMASTER -> NEO SYMBOL -> QUOTES
// api/quotes.js
// ============================================

const LOGIN_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

const VALIDATE_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

const ACCESS_TOKEN =
  process.env.NEO_ACCESS_TOKEN;

const MOBILE =
  process.env.NEO_MOBILE;

const UCC =
  process.env.NEO_UCC;

const MPIN =
  process.env.NEO_MPIN;


// ============================================
// NIFTY 50 SYMBOLS
// ============================================

const NIFTY_SYMBOLS = [
  "ADANIENT",
  "ADANIPORTS",
  "APOLLOHOSP",
  "ASIANPAINT",
  "AXISBANK",
  "BAJAJ-AUTO",
  "BAJFINANCE",
  "BAJAJFINSV",
  "BEL",
  "BHARTIARTL",
  "CIPLA",
  "COALINDIA",
  "DRREDDY",
  "EICHERMOT",
  "ETERNAL",
  "GRASIM",
  "HCLTECH",
  "HDFCBANK",
  "HDFCLIFE",
  "HEROMOTOCO",
  "HINDALCO",
  "HINDUNILVR",
  "ICICIBANK",
  "INDUSINDBK",
  "INFY",
  "ITC",
  "JIOFIN",
  "JSWSTEEL",
  "KOTAKBANK",
  "LT",
  "M&M",
  "MARUTI",
  "MAXHEALTH",
  "NESTLEIND",
  "NTPC",
  "ONGC",
  "POWERGRID",
  "RELIANCE",
  "SBILIFE",
  "SBIN",
  "SHRIRAMFIN",
  "SUNPHARMA",
  "TATACONSUM",
  "TATAMOTORS",
  "TATASTEEL",
  "TCS",
  "TECHM",
  "TITAN",
  "TRENT",
  "ULTRACEMCO"
];


// ============================================
// RESPONSE
// ============================================

function send(res, status, body) {
  return res.status(status).json(body);
}


// ============================================
// SAFE JSON
// ============================================

async function readResponse(response) {

  const text =
    await response.text();

  try {

    return {
      json: text
        ? JSON.parse(text)
        : null,
      text
    };

  } catch {

    return {
      json: null,
      text
    };

  }

}


// ============================================
// GET DATA OBJECT
// ============================================

function getData(data) {

  if (
    data &&
    typeof data === "object" &&
    data.data &&
    typeof data.data === "object"
  ) {
    return data.data;
  }

  return data || {};
}


// ============================================
// SCRIPMASTER FETCH
// ============================================

async function getScripMaster(baseUrl, authToken) {

  const url =
    baseUrl.replace(/\/+$/, "") +
    "/script-details/1.0/masterscrip/file-paths";


  const response =
    await fetch(
      url,
      {
        method: "GET",

        headers: {
          "Authorization":
            authToken,

          "neo-fin-key":
            "neotradeapi",

          "Accept":
            "application/json"
        },

        cache:
          "no-store"
      }
    );


  const result =
    await readResponse(
      response
    );


  if (!response.ok) {

    throw new Error(
      "Scripmaster file-path API failed: HTTP " +
      response.status
    );

  }


  return result.json;

}


// ============================================
// FIND ARRAY RECURSIVELY
// ============================================

function findArray(obj) {

  if (!obj || typeof obj !== "object") {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj;
  }

  for (const key of Object.keys(obj)) {

    const value =
      obj[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (
      value &&
      typeof value === "object"
    ) {

      const found =
        findArray(value);

      if (found) {
        return found;
      }

    }

  }

  return null;

}


// ============================================
// NORMALIZE SYMBOL
// ============================================

function cleanSymbol(value) {

  return String(
    value || ""
  )
    .trim()
    .toUpperCase()
    .replace(/-EQ$/i, "");

}


// ============================================
// FIND NEO SYMBOL IN MASTER
// ============================================

function findNeoSymbol(master, target) {

  const targetSymbol =
    cleanSymbol(target);


  const rows =
    findArray(master);


  if (!rows) {
    return null;
  }


  for (const row of rows) {

    if (
      !row ||
      typeof row !== "object"
    ) {
      continue;
    }


    const exchange =
      cleanSymbol(
        row.pExchange ||
        row.exchange ||
        row.pExchSeg
      );


    const tradingSymbol =
      cleanSymbol(
        row.pTrdSymbol ||
        row.trading_symbol ||
        row.tradingSymbol
      );


    const symbol =
      cleanSymbol(
        row.pSymbol ||
        row.symbol
      );


    const displaySymbol =
      cleanSymbol(
        row.display_symbol ||
        row.displaySymbol
      );


    const refKey =
      cleanSymbol(
        row.pScripRefKey ||
        row.scripRefKey
      );


    const matches =
      targetSymbol === tradingSymbol ||
      targetSymbol === symbol ||
      targetSymbol === displaySymbol ||
      targetSymbol === refKey;


    if (!matches) {
      continue;
    }


    // Prefer NSE cash segment.
    if (
      exchange &&
      !(
        exchange === "NSE_CM" ||
        exchange === "NSECM" ||
        exchange === "NSE"
      )
    ) {
      continue;
    }


    return (
      row.pSymbol ||
      row.pTrdSymbol ||
      row.pScripRefKey ||
      row.symbol ||
      null
    );

  }


  return null;

}


// ============================================
// MAIN
// ============================================

export default async function handler(req, res) {

  if (req.method !== "POST") {

    return send(res, 405, {
      success: false,
      error: "Use POST method."
    });

  }


  // ------------------------------------------
  // ENVIRONMENT
  // ------------------------------------------

  if (!ACCESS_TOKEN) {
    return send(res, 500, {
      success: false,
      step: "ENVIRONMENT",
      error: "NEO_ACCESS_TOKEN missing."
    });
  }


  if (!MOBILE) {
    return send(res, 500, {
      success: false,
      step: "ENVIRONMENT",
      error: "NEO_MOBILE missing."
    });
  }


  if (!UCC) {
    return send(res, 500, {
      success: false,
      step: "ENVIRONMENT",
      error: "NEO_UCC missing."
    });
  }


  if (!MPIN) {
    return send(res, 500, {
      success: false,
      step: "ENVIRONMENT",
      error: "NEO_MPIN missing."
    });
  }


  // ------------------------------------------
  // TOTP
  // ------------------------------------------

  const totp =
    String(
      req.body?.totp || ""
    ).trim();


  if (!/^\d{6}$/.test(totp)) {

    return send(res, 400, {
      success: false,
      step: "TOTP",
      error:
        "Current 6-digit TOTP required."
    });

  }


  try {

    // ========================================
    // 1. TOTP LOGIN
    // ========================================

    const loginResponse =
      await fetch(
        LOGIN_URL,
        {
          method: "POST",

          headers: {
            "Authorization":
              String(ACCESS_TOKEN).trim(),

            "neo-fin-key":
              "neotradeapi",

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          },

          body:
            JSON.stringify({

              mobileNumber:
                String(MOBILE).trim(),

              ucc:
                String(UCC).trim(),

              totp:
                totp

            }),

          cache:
            "no-store"
        }
      );


    const login =
      await readResponse(
        loginResponse
      );


    if (
      !login.json
    ) {

      return send(res, 502, {

        success: false,

        step:
          "TOTP LOGIN",

        status:
          loginResponse.status,

        error:
          "Kotak returned non-JSON response.",

        rawResponse:
          login.text.substring(
            0,
            2000
          )

      });

    }


    if (!loginResponse.ok) {

      return send(
        res,
        loginResponse.status,
        {

          success: false,

          step:
            "TOTP LOGIN",

          error:
            "Kotak TOTP login failed.",

          kotakResponse:
            login.json

        }
      );

    }


    const loginData =
      getData(
        login.json
      );


    const sid =
      loginData.sid ||
      loginData.Sid ||
      loginData.viewSid;


    const auth =
      loginData.token ||
      loginData.Auth ||
      loginData.auth ||
      loginData.viewToken;


    if (!sid || !auth) {

      return send(res, 502, {

        success: false,

        step:
          "TOTP LOGIN",

        error:
          "Sid/Auth not returned by Kotak."

      });

    }


    // ========================================
    // 2. MPIN VALIDATION
    // ========================================

    const validateResponse =
      await fetch(
        VALIDATE_URL,
        {

          method: "POST",

          headers: {

            "Authorization":
              String(
                ACCESS_TOKEN
              ).trim(),

            "neo-fin-key":
              "neotradeapi",

            "Sid":
              String(sid),

            "Auth":
              String(auth),

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body:
            JSON.stringify({

              mpin:
                String(
                  MPIN
                ).trim()

            }),

          cache:
            "no-store"

        }
      );


    const validation =
      await readResponse(
        validateResponse
      );


    if (
      !validation.json
    ) {

      return send(res, 502, {

        success: false,

        step:
          "MPIN VALIDATION",

        status:
          validateResponse.status,

        error:
          "Kotak MPIN validation returned non-JSON.",

        rawResponse:
          validation.text.substring(
            0,
            2000
          )

      });

    }


    if (!validateResponse.ok) {

      return send(
        res,
        validateResponse.status,
        {

          success: false,

          step:
            "MPIN VALIDATION",

          error:
            "MPIN validation failed.",

          kotakResponse:
            validation.json

        }
      );

    }


    const validationData =
      getData(
        validation.json
      );


    const baseUrl =
      validationData.baseUrl ||
      validationData.base_url;


    if (!baseUrl) {

      return send(res, 502, {

        success: false,

        step:
          "MPIN VALIDATION",

        error:
          "Kotak did not return baseUrl.",

        kotakResponse:
          validation.json

      });

    }


    // ========================================
    // 3. GET SCRIPMASTER PATH
    // ========================================

    const masterInfo =
      await getScripMaster(
        baseUrl,
        ACCESS_TOKEN
      );


    // ----------------------------------------
    // IMPORTANT
    // ----------------------------------------

    // Different Kotak responses can expose
    // file paths differently. We return the
    // response if no downloadable master path
    // is available instead of guessing.


    const masterPath =
      masterInfo?.data?.filePath ||
      masterInfo?.data?.file_path ||
      masterInfo?.filePath ||
      masterInfo?.file_path;


    if (!masterPath) {

      return send(res, 502, {

        success: false,

        step:
          "SCRIPMASTER",

        error:
          "Kotak returned Scripmaster information but no downloadable file path was found.",

        kotakResponse:
          masterInfo

      });

    }


    // ========================================
    // 4. DOWNLOAD SCRIPMASTER
    // ========================================

    const masterUrl =
      String(masterPath)
        .startsWith("http")
        ? String(masterPath)
        : (
          baseUrl.replace(/\/+$/, "") +
          "/" +
          String(masterPath)
            .replace(/^\/+/, "")
        );


    const masterResponse =
      await fetch(
        masterUrl,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    const masterText =
      await masterResponse.text();


    if (!masterResponse.ok) {

      return send(res, 502, {

        success: false,

        step:
          "SCRIPMASTER DOWNLOAD",

        status:
          masterResponse.status,

        error:
          "Scripmaster download failed.",

        rawResponse:
          masterText.substring(
            0,
            2000
          )

      });

    }


    // ========================================
    // 5. PARSE MASTER
    // ========================================

    let masterData = null;


    try {

      masterData =
        JSON.parse(
          masterText
        );

    } catch {

      return send(res, 502, {

        success: false,

        step:
          "SCRIPMASTER PARSE",

        error:
          "Downloaded Scripmaster is not JSON.",

        rawResponse:
          masterText.substring(
            0,
            1000
          )

      });

    }


    // ========================================
    // 6. RESOLVE NIFTY SYMBOLS
    // ========================================

    const resolved = [];

    const missing = [];


    for (
      const niftySymbol
      of NIFTY_SYMBOLS
    ) {

      const neoSymbol =
        findNeoSymbol(
          masterData,
          niftySymbol
        );


      if (!neoSymbol) {

        missing.push(
          niftySymbol
        );

        continue;

      }


      resolved.push({

        symbol:
          niftySymbol,

        neoSymbol:
          String(
            neoSymbol
          )

      });

    }


    // ----------------------------------------
    // DO NOT SEND INVALID SYMBOLS
    // ----------------------------------------

    if (
      resolved.length === 0
    ) {

      return send(res, 502, {

        success: false,

        step:
          "SCRIPMASTER MAPPING",

        error:
          "No valid NSE Neo symbols could be resolved.",

        resolvedCount:
          0,

        missing:
          missing

      });

    }


    // ========================================
    // 7. QUOTES
    // ========================================

    const neoSymbols =
      resolved
        .map(
          item =>
            item.neoSymbol
        )
        .join(",");


    const quotesUrl =
      baseUrl.replace(/\/+$/, "") +
      "/script-details/1.0/quotes/neosymbol/" +
      encodeURIComponent(
        neoSymbols
      ) +
      "/all";


    const quotesResponse =
      await fetch(
        quotesUrl,
        {

          method:
            "GET",

          headers: {

            "Authorization":
              String(
                ACCESS_TOKEN
              ).trim(),

            "Accept":
              "application/json"

          },

          cache:
            "no-store"

        }
      );


    const quotes =
      await readResponse(
        quotesResponse
      );


    if (
      !quotes.json
    ) {

      return send(res, 502, {

        success: false,

        step:
          "QUOTES",

        status:
          quotesResponse.status,

        error:
          "Kotak Quotes returned non-JSON.",

        rawResponse:
          quotes.text.substring(
            0,
            2000
          )

      });

    }


    if (!quotesResponse.ok) {

      return send(
        res,
        quotesResponse.status,
        {

          success: false,

          step:
            "QUOTES",

          error:
            "Kotak Quotes request failed.",

          kotakResponse:
            quotes.json,

          resolvedCount:
            resolved.length

        }
      );

    }


    // ========================================
    // SUCCESS
    // ========================================

    return send(res, 200, {

      success:
        true,

      source:
        "KOTAK NEO",

      marketData:
        "LIVE",

      totalRequested:
        NIFTY_SYMBOLS.length,

      resolvedSymbols:
        resolved.length,

      missingSymbols:
        missing,

      neoSymbols:
        resolved,

      kotakResponse:
        quotes.json

    });


  } catch (error) {

    console.error(
      "Prototype-1 Quotes Error:",
      error
    );


    return send(res, 500, {

      success: false,

      source:
        "KOTAK NEO",

      step:
        "QUOTES",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
