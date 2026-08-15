// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES - DIAGNOSTIC VERSION
// api/quotes.js
// ============================================

const ACCESS_TOKEN = process.env.NEO_ACCESS_TOKEN;
const MOBILE = process.env.NEO_MOBILE;
const UCC = process.env.NEO_UCC;
const MPIN = process.env.NEO_MPIN;

const LOGIN_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

const VALIDATE_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

const SCRIPMASTER_URL =
  "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";

const NIFTY_50 = [
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
  "TATASTEEL",
  "TCS",
  "TECHM",
  "TITAN",
  "TRENT",
  "ULTRACEMCO"
];

function send(res, status, body) {
  return res.status(status).json(body);
}

async function readResponse(response) {
  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return {
    text,
    data
  };
}

function normalizeMobile(value) {
  const mobile = String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");

  if (/^\d{10}$/.test(mobile)) {
    return "+91" + mobile;
  }

  return mobile;
}

function safeKotakError(data) {
  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return data.slice(0, 1000);
  }

  if (Array.isArray(data)) {
    return data.slice(0, 5);
  }

  return {
    message:
      data.message ||
      data.Message ||
      null,

    description:
      data.description ||
      data.Description ||
      null,

    error:
      data.error ||
      data.Error ||
      null,

    fault:
      data.fault ||
      null,

    code:
      data.code ||
      data.Code ||
      null
  };
}

function parseCsvLine(line) {
  const values = [];

  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {

    const ch = line[i];

    if (ch === '"') {

      if (
        quoted &&
        line[i + 1] === '"'
      ) {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (
      ch === "," &&
      !quoted
    ) {
      values.push(
        current.trim()
      );

      current = "";

    } else {
      current += ch;
    }
  }

  values.push(
    current.trim()
  );

  return values;
}

function loadSymbolMap(csvText) {

  const lines =
    csvText
      .split(/\r?\n/)
      .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "Scripmaster CSV is empty."
    );
  }

  const header =
    parseCsvLine(lines[0]);

  const iSymbol =
    header.indexOf("pSymbol");

  const iExchange =
    header.indexOf("pExchSeg");

  const iTrading =
    header.indexOf("pTrdSymbol");

  const iRef =
    header.indexOf("pScripRefKey");

  if (
    iSymbol < 0 ||
    iExchange < 0 ||
    iTrading < 0 ||
    iRef < 0
  ) {
    throw new Error(
      "Required Scripmaster fields missing."
    );
  }

  const map = {};

  for (
    let i = 1;
    i < lines.length;
    i++
  ) {

    const row =
      parseCsvLine(lines[i]);

    const exchange =
      String(
        row[iExchange] || ""
      )
        .trim()
        .toLowerCase();

    if (
      exchange !== "nse_cm"
    ) {
      continue;
    }

    const pSymbol =
      String(
        row[iSymbol] || ""
      ).trim();

    const pTrdSymbol =
      String(
        row[iTrading] || ""
      ).trim();

    const pScripRefKey =
      String(
        row[iRef] || ""
      ).trim();

    if (!pSymbol) {
      continue;
    }

    const symbol =
      pScripRefKey
        .toUpperCase()
        .replace(/-EQ$/i, "");

    const tradingSymbol =
      pTrdSymbol
        .toUpperCase()
        .replace(/-EQ$/i, "");

    for (
      const target of NIFTY_50
    ) {

      const cleanTarget =
        target.toUpperCase();

      if (
        symbol === cleanTarget ||
        tradingSymbol === cleanTarget
      ) {

        map[cleanTarget] = {
          symbol:
            cleanTarget,

          neoSymbol:
            pSymbol,

          pTrdSymbol:
            pTrdSymbol,

          pScripRefKey:
            pScripRefKey
        };

        break;
      }
    }
  }

  return map;
}


// ============================================
// STEP 1 — TOTP LOGIN
// ============================================

async function kotakLogin(totp) {

  const mobileNumber =
    normalizeMobile(MOBILE);

  if (
    !/^\+91\d{10}$/.test(
      mobileNumber
    )
  ) {

    throw new Error(
      "Invalid NEO_MOBILE."
    );
  }

  const response =
    await fetch(
      LOGIN_URL,
      {
        method: "POST",

        headers: {

          Authorization:
            String(
              ACCESS_TOKEN
            ).trim(),

          "neo-fin-key":
            "neotradeapi",

          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify({

            mobileNumber:
              mobileNumber,

            ucc:
              String(UCC).trim(),

            totp:
              totp

          })
      }
    );

  const result =
    await readResponse(
      response
    );

  if (!result.data) {

    return {
      success: false,

      stage:
        "TOTP LOGIN",

      status:
        response.status,

      error:
        "Kotak TOTP login returned non-JSON response.",

      rawResponse:
        result.text.slice(
          0,
          1000
        )
    };
  }

  if (!response.ok) {

    return {
      success: false,

      stage:
        "TOTP LOGIN",

      status:
        response.status,

      error:
        "Kotak TOTP login failed.",

      kotakError:
        safeKotakError(
          result.data
        )
    };
  }

  const root =
    result.data?.data ||
    result.data;

  const sid =
    root?.sid ||
    root?.Sid ||
    root?.sessionId ||
    root?.sessionID ||
    root?.viewSid ||
    result.data?.sid ||
    result.data?.Sid ||
    null;

  const auth =
    root?.Auth ||
    root?.auth ||
    root?.token ||
    root?.Token ||
    root?.viewToken ||
    result.data?.Auth ||
    result.data?.auth ||
    result.data?.token ||
    null;

  if (!sid || !auth) {

    return {
      success: false,

      stage:
        "TOTP LOGIN",

      status:
        response.status,

      error:
        "TOTP login response received, but Sid/Auth was not found.",

      detectedFields:
        Object.keys(
          root || {}
        )
    };
  }

  return {
    success: true,

    sid:
      String(sid),

    auth:
      String(auth),

    detectedFields:
      Object.keys(
        root || {}
      )
  };
}


// ============================================
// STEP 2 — MPIN VALIDATION
// ============================================

async function kotakValidate(
  login
) {

  const response =
    await fetch(
      VALIDATE_URL,
      {
        method: "POST",

        headers: {

          Authorization:
            String(
              ACCESS_TOKEN
            ).trim(),

          "neo-fin-key":
            "neotradeapi",

          Sid:
            String(
              login.sid
            ).trim(),

          Auth:
            String(
              login.auth
            ).trim(),

          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify({

            mpin:
              String(
                MPIN
              ).trim()

          })
      }
    );

  const result =
    await readResponse(
      response
    );

  if (!result.data) {

    return {
      success: false,

      stage:
        "MPIN VALIDATION",

      status:
        response.status,

      error:
        "Kotak MPIN validation returned non-JSON response.",

      rawResponse:
        result.text.slice(
          0,
          1000
        )
    };
  }

  const root =
    result.data?.data ||
    result.data;

  if (!response.ok) {

    return {
      success: false,

      stage:
        "MPIN VALIDATION",

      status:
        response.status,

      error:
        "Kotak MPIN validation failed.",

      kotakError:
        safeKotakError(
          result.data
        ),

      detectedFields:
        Object.keys(
          root || {}
        )
    };
  }

  const baseUrl =
    root?.baseUrl ||
    root?.base_url ||
    root?.BaseUrl ||
    root?.BaseURL ||
    null;

  const tradeSid =
    root?.sid ||
    root?.Sid ||
    root?.sessionId ||
    root?.sessionID ||
    login.sid ||
    null;

  const tradeAuth =
    root?.Auth ||
    root?.auth ||
    root?.token ||
    root?.Token ||
    login.auth ||
    null;

  if (!baseUrl) {

    return {
      success: false,

      stage:
        "MPIN VALIDATION",

      status:
        response.status,

      error:
        "MPIN validation response received, but baseUrl was not found.",

      baseUrlFound:
        false,

      sidFound:
        Boolean(tradeSid),

      authFound:
        Boolean(tradeAuth),

      detectedFields:
        Object.keys(
          root || {}
        ),

      kotakError:
        safeKotakError(
          result.data
        )
    };
  }

  if (
    !tradeSid ||
    !tradeAuth
  ) {

    return {
      success: false,

      stage:
        "MPIN VALIDATION",

      status:
        response.status,

      error:
        "baseUrl found, but session Sid/Auth is missing.",

      baseUrlFound:
        true,

      sidFound:
        Boolean(tradeSid),

      authFound:
        Boolean(tradeAuth),

      detectedFields:
        Object.keys(
          root || {}
        )
    };
  }

  return {
    success: true,

    baseUrl:
      String(baseUrl)
        .replace(/\/+$/, ""),

    sid:
      String(tradeSid),

    auth:
      String(tradeAuth),

    detectedFields:
      Object.keys(
        root || {}
      )
  };
}


// ============================================
// STEP 3 — SCRIPMASTER
// ============================================

async function getScripmaster() {

  const response =
    await fetch(
      SCRIPMASTER_URL,
      {
        method: "GET",

        headers: {
          Accept:
            "text/csv"
        },

        cache:
          "no-store"
      }
    );

  const text =
    await response.text();

  if (!response.ok) {

    return {
      success: false,

      stage:
        "SCRIPMASTER",

      status:
        response.status,

      error:
        "Scripmaster download failed.",

      rawResponse:
        text.slice(
          0,
          1000
        )
    };
  }

  if (
    !text ||
    text.length < 100
  ) {

    return {
      success: false,

      stage:
        "SCRIPMASTER",

      status:
        response.status,

      error:
        "Scripmaster response is empty or too small.",

      responseLength:
        text.length
    };
  }

  return {
    success: true,

    text,

    status:
      response.status,

    responseLength:
      text.length,

    header:
      text
        .split(/\r?\n/)[0]
        .slice(
          0,
          2000
        )
  };
}


// ============================================
// STEP 4 — QUOTES
// ============================================

async function getQuotes(
  session,
  symbolMap
) {

  const resolved =
    NIFTY_50
      .map(
        symbol =>
          symbolMap[
            symbol
          ]
      )
      .filter(Boolean);

  const missing =
    NIFTY_50.filter(
      symbol =>
        !symbolMap[
          symbol
        ]
    );

  if (!resolved.length) {

    return {
      success: false,

      stage:
        "QUOTES",

      status:
        0,

      error:
        "No Nifty 50 Neo symbols were resolved.",

      resolvedCount:
        0,

      missingSymbols:
        missing
    };
  }

  const neoSymbols =
    resolved.map(
      item =>
        item.neoSymbol
    );

  const encodedSymbols =
    encodeURIComponent(
      neoSymbols.join(",")
    );

  const quoteUrl =
    session.baseUrl +
    "/script-details/1.0/quotes/neosymbol/" +
    encodedSymbols +
    "/all";

  const response =
    await fetch(
      quoteUrl,
      {
        method: "GET",

        headers: {

          // IMPORTANT:
          // Quotes endpoint uses the
          // consumer/access token.
          Authorization:
            String(
              ACCESS_TOKEN
            ).trim(),

          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept:
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

  if (!result.data) {

    return {
      success: false,

      stage:
        "QUOTES",

      status:
        response.status,

      error:
        "Kotak Quotes returned non-JSON response.",

      resolvedCount:
        resolved.length,

      missingSymbols:
        missing,

      rawResponse:
        result.text.slice(
          0,
          1500
        )
    };
  }

  if (!response.ok) {

    return {
      success: false,

      stage:
        "QUOTES",

      status:
        response.status,

      error:
        "Kotak Quotes HTTP request failed.",

      resolvedCount:
        resolved.length,

      missingSymbols:
        missing,

      kotakError:
        safeKotakError(
          result.data
        )
    };
  }

  return {
    success: true,

    status:
      response.status,

    resolved,

    missing,

    data:
      result.data
  };
}


// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req,
  res
) {

  if (
    req.method !== "POST"
  ) {

    return send(
      res,
      405,
      {
        success: false,

        error:
          "Use POST method."
      }
    );
  }


  // ==========================================
  // ENVIRONMENT CHECK
  // ==========================================

  const missingEnv = [];

  if (!ACCESS_TOKEN)
    missingEnv.push(
      "NEO_ACCESS_TOKEN"
    );

  if (!MOBILE)
    missingEnv.push(
      "NEO_MOBILE"
    );

  if (!UCC)
    missingEnv.push(
      "NEO_UCC"
    );

  if (!MPIN)
    missingEnv.push(
      "NEO_MPIN"
    );

  if (
    missingEnv.length
  ) {

    return send(
      res,
      500,
      {
        success: false,

        stage:
          "ENVIRONMENT",

        error:
          "Required Kotak environment variables are missing.",

        missing:
          missingEnv
      }
    );
  }


  // ==========================================
  // TOTP CHECK
  // ==========================================

  const totp =
    String(
      req.body?.totp || ""
    ).trim();

  if (
    !/^\d{6}$/.test(
      totp
    )
  ) {

    return send(
      res,
      400,
      {
        success: false,

        stage:
          "TOTP INPUT",

        error:
          "Current 6-digit TOTP required."
      }
    );
  }


  try {

    // ========================================
    // STEP 1
    // ========================================

    const login =
      await kotakLogin(
        totp
      );

    if (
      !login.success
    ) {

      return send(
        res,
        502,
        login
      );
    }


    // ========================================
    // STEP 2
    // ========================================

    const session =
      await kotakValidate(
        login
      );

    if (
      !session.success
    ) {

      return send(
        res,
        502,
        session
      );
    }


    // ========================================
    // STEP 3
    // ========================================

    const scripmaster =
      await getScripmaster();

    if (
      !scripmaster.success
    ) {

      return send(
        res,
        502,
        scripmaster
      );
    }


    // ========================================
    // SYMBOL MAP
    // ========================================

    let symbolMap;

    try {

      symbolMap =
        loadSymbolMap(
          scripmaster.text
        );

    } catch (error) {

      return send(
        res,
        502,
        {
          success: false,

          stage:
            "SCRIPMASTER PARSING",

          error:
            error.message,

          scripmasterHeader:
            scripmaster.header
        }
      );
    }


    const resolvedCount =
      Object.keys(
        symbolMap
      ).length;

    const missingSymbols =
      NIFTY_50.filter(
        symbol =>
          !symbolMap[
            symbol
          ]
      );


    // ========================================
    // STEP 4
    // ========================================

    const quotes =
      await getQuotes(
        session,
        symbolMap
      );

    if (
      !quotes.success
    ) {

      return send(
        res,
        502,
        {
          ...quotes,

          totalNifty50:
            NIFTY_50.length,

          resolvedCount:
            resolvedCount,

          missingSymbols:
            missingSymbols
        }
      );
    }


    // ========================================
    // FINAL SUCCESS
    // ========================================

    const quoteData =
      quotes.data;

    let totalReceived =
      null;

    if (
      Array.isArray(
        quoteData
      )
    ) {

      totalReceived =
        quoteData.length;

    } else if (
      Array.isArray(
        quoteData?.data
      )
    ) {

      totalReceived =
        quoteData.data.length;

    } else if (
      Array.isArray(
        quoteData?.quotes
      )
    ) {

      totalReceived =
        quoteData.quotes.length;

    }


    return send(
      res,
      200,
      {
        success: true,

        source:
          "KOTAK NEO",

        marketData:
          "LIVE",

        totalRequested:
          NIFTY_50.length,

        totalResolved:
          resolvedCount,

        totalReceived:
          totalReceived,

        missingSymbols:
          missingSymbols,

        quotes:
          quoteData
      }
    );


  } catch (error) {

    console.error(
      "Prototype-1 Quotes Error:",
      error
    );

    return send(
      res,
      502,
      {
        success: false,

        stage:
          "UNEXPECTED SERVER ERROR",

        source:
          "KOTAK NEO",

        error:
          error?.message ||
          "Unexpected Kotak Neo error."
      }
    );
  }
}
