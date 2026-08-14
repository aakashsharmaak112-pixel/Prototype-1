// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// TOTP + MPIN + SCRIPMASTER
// api/quotes.js
// ============================================

const ACCESS_TOKEN =
  process.env.NEO_ACCESS_TOKEN;

const MOBILE =
  process.env.NEO_MOBILE;

const UCC =
  process.env.NEO_UCC;

const MPIN =
  process.env.NEO_MPIN;


// ============================================
// KOTAK LOGIN
// ============================================

const LOGIN_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

const VALIDATE_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";


// ============================================
// SCRIPMASTER
// CURRENT MASTER USED BY PROJECT
// ============================================

const SCRIPMASTER_URL =
  "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";


// ============================================
// NIFTY 50 SYMBOLS
// ============================================

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
  "TATAMOTORS",
  "TATASTEEL",
  "TCS",
  "TECHM",
  "TITAN",
  "TRENT",
  "ULTRACEMCO"
];


// ============================================
// RESPONSE HELPER
// ============================================

function send(res, status, data) {
  return res.status(status).json(data);
}


// ============================================
// SAFE JSON PARSER
// ============================================

async function readResponse(response) {

  const text =
    await response.text();

  let json = null;

  try {

    json =
      text
        ? JSON.parse(text)
        : null;

  } catch {

    json = null;

  }

  return {
    text,
    json
  };
}


// ============================================
// NORMALIZE MOBILE
// ============================================

function normalizeMobile(value) {

  let mobile =
    String(value || "")
      .trim()
      .replace(/[\s-]/g, "");

  if (/^\d{10}$/.test(mobile)) {
    mobile =
      "+91" + mobile;
  }

  return mobile;
}


// ============================================
// CSV PARSER
// ============================================

function parseCsvLine(line) {

  const values = [];

  let current = "";

  let insideQuotes = false;


  for (
    let i = 0;
    i < line.length;
    i++
  ) {

    const char =
      line[i];


    if (char === '"') {

      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      } else {

        insideQuotes =
          !insideQuotes;

      }

      continue;
    }


    if (
      char === "," &&
      !insideQuotes
    ) {

      values.push(
        current.trim()
      );

      current = "";

    } else {

      current += char;

    }

  }


  values.push(
    current.trim()
  );


  return values;
}


// ============================================
// DOWNLOAD SCRIPMASTER
// ============================================

async function downloadScripmaster() {

  const response =
    await fetch(
      SCRIPMASTER_URL,
      {
        method: "GET",

        headers: {
          Accept: "text/csv"
        },

        cache:
          "no-store"
      }
    );


  const text =
    await response.text();


  if (!response.ok) {

    throw new Error(
      "Scripmaster download failed. HTTP " +
      response.status
    );

  }


  return text;
}


// ============================================
// BUILD SYMBOL MAP
// ============================================

function buildSymbolMap(csvText) {

  const lines =
    csvText
      .split(/\r?\n/)
      .filter(
        line =>
          line.trim() !== ""
      );


  if (lines.length < 2) {

    throw new Error(
      "Scripmaster CSV is empty."
    );

  }


  const header =
    parseCsvLine(
      lines[0]
    );


  function indexOf(name) {

    return header.indexOf(name);

  }


  const symbolIndex =
    indexOf("pSymbol");

  const exchangeIndex =
    indexOf("pExchSeg");

  const tradingSymbolIndex =
    indexOf("pTrdSymbol");

  const refKeyIndex =
    indexOf("pScripRefKey");

  const combinedIndex =
    indexOf("pCombinedSymbol");

  const contractIdIndex =
    indexOf("pContractId");


  const required = [
    ["pSymbol", symbolIndex],
    ["pExchSeg", exchangeIndex],
    ["pTrdSymbol", tradingSymbolIndex],
    ["pScripRefKey", refKeyIndex]
  ];


  const missing =
    required
      .filter(
        item =>
          item[1] < 0
      )
      .map(
        item =>
          item[0]
      );


  if (missing.length) {

    throw new Error(
      "Scripmaster fields missing: " +
      missing.join(", ")
    );

  }


  const map = {};

  const duplicateSymbols = [];


  for (
    let i = 1;
    i < lines.length;
    i++
  ) {

    const row =
      parseCsvLine(
        lines[i]
      );


    const exchange =
      String(
        row[exchangeIndex] || ""
      )
        .trim()
        .toLowerCase();


    // NSE CASH ONLY
    if (
      exchange !== "nse_cm"
    ) {

      continue;

    }


    const pSymbol =
      String(
        row[symbolIndex] || ""
      ).trim();


    const pTrdSymbol =
      String(
        row[tradingSymbolIndex] || ""
      ).trim();


    const pScripRefKey =
      String(
        row[refKeyIndex] || ""
      ).trim();


    const pCombinedSymbol =
      combinedIndex >= 0
        ? String(
            row[combinedIndex] || ""
          ).trim()
        : "";


    const pContractId =
      contractIdIndex >= 0
        ? String(
            row[contractIdIndex] || ""
          ).trim()
        : "";


    if (!pSymbol) {
      continue;
    }


    const cleanTrading =
      pTrdSymbol
        .toUpperCase()
        .replace(/-EQ$/, "");


    const cleanSymbol =
      pSymbol
        .toUpperCase()
        .replace(/-EQ$/, "");


    const cleanCombined =
      pCombinedSymbol
        .toUpperCase()
        .replace(/-EQ$/, "");


    const candidates = [
      cleanSymbol,
      cleanTrading,
      cleanCombined
    ];


    for (
      const niftySymbol
      of NIFTY_50
    ) {

      const target =
        niftySymbol
          .toUpperCase();


      if (
        candidates.includes(target)
      ) {

        if (
          map[target]
        ) {

          duplicateSymbols.push(
            target
          );

          continue;

        }


        map[target] = {

          symbol:
            target,

          neoSymbol:
            pSymbol,

          pSymbol:
            pSymbol,

          pTrdSymbol:
            pTrdSymbol,

          pScripRefKey:
            pScripRefKey,

          pCombinedSymbol:
            pCombinedSymbol,

          pContractId:
            pContractId,

          exchange:
            exchange

        };


        break;

      }

    }

  }


  return {
    map,
    duplicateSymbols
  };
}


// ============================================
// TOTP LOGIN
// ============================================

async function loginWithTotp(
  mobileNumber,
  totp
) {

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
              String(
                UCC
              ).trim(),

            totp:
              String(
                totp
              )

          }),

        cache:
          "no-store"

      }
    );


  const result =
    await readResponse(
      response
    );


  if (!result.json) {

    throw new Error(
      "Kotak TOTP Login returned non-JSON response."
    );

  }


  if (!response.ok) {

    const message =
      result
        .json
        ?.error?.[0]
        ?.message ||
      "Kotak TOTP login failed.";


    throw new Error(
      message
    );

  }


  const session =
    result.json?.data ||
    result.json;


  const sid =
    session?.sid ||
    session?.Sid ||
    null;


  const auth =
    session?.token ||
    session?.Auth ||
    session?.auth ||
    null;


  if (!sid || !auth) {

    throw new Error(
      "TOTP login succeeded but Sid/Auth was not returned."
    );

  }


  return {
    sid,
    auth,
    response:
      result.json
  };

}


// ============================================
// MPIN VALIDATION
// ============================================

async function validateMpin(
  sid,
  auth
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
              sid
            ).trim(),

          Auth:
            String(
              auth
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

          }),

        cache:
          "no-store"

      }
    );


  const result =
    await readResponse(
      response
    );


  if (!result.json) {

    throw new Error(
      "Kotak MPIN validation returned non-JSON response."
    );

  }


  if (!response.ok) {

    const message =
      result
        .json
        ?.error?.[0]
        ?.message ||
      "Kotak MPIN validation failed.";


    throw new Error(
      message
    );

  }


  const data =
    result.json?.data ||
    result.json;


  const baseUrl =
    data?.baseUrl ||
    data?.base_url ||
    null;


  const tradeSid =
    data?.sid ||
    data?.Sid ||
    sid;


  const tradeToken =
    data?.token ||
    data?.Auth ||
    data?.auth ||
    auth;


  if (!baseUrl) {

    throw new Error(
      "MPIN validation succeeded but baseUrl was not returned."
    );

  }


  return {

    baseUrl:
      String(
        baseUrl
      ).replace(/\/+$/, ""),

    sid:
      tradeSid,

    auth:
      tradeToken,

    response:
      result.json

  };

}


// ============================================
// KOTAK QUOTES
// ============================================

async function getQuotes(
  baseUrl,
  sid,
  auth,
  neoSymbols
) {

  const encodedSymbols =
    encodeURIComponent(
      neoSymbols.join(",")
    );


  const quotesUrl =
    baseUrl +
    "/script-details/1.0/quotes/" +
    encodedSymbols +
    "/all";


  const response =
    await fetch(
      quotesUrl,
      {

        method: "GET",

        headers: {

          Authorization:
            String(
              ACCESS_TOKEN
            ).trim(),

          "neo-fin-key":
            "neotradeapi",

          Sid:
            String(
              sid
            ).trim(),

          Auth:
            String(
              auth
            ).trim(),

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


  if (!result.json) {

    return {

      success:
        false,

      status:
        response.status,

      error:
        "Kotak Neo returned non-JSON response.",

      rawResponse:
        result.text.substring(
          0,
          3000
        )

    };

  }


  if (!response.ok) {

    return {

      success:
        false,

      status:
        response.status,

      error:
        "Kotak Neo Quotes request failed.",

      kotakResponse:
        result.json

    };

  }


  return {

    success:
      true,

    status:
      response.status,

    data:
      result.json

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
        success:
          false,

        error:
          "Use POST method."
      }
    );

  }


  // ========================================
  // ENVIRONMENT CHECK
  // ========================================

  if (!ACCESS_TOKEN) {

    return send(
      res,
      500,
      {
        success:
          false,

        step:
          "ENVIRONMENT",

        error:
          "NEO_ACCESS_TOKEN missing."
      }
    );

  }


  if (!MOBILE) {

    return send(
      res,
      500,
      {
        success:
          false,

        step:
          "ENVIRONMENT",

        error:
          "NEO_MOBILE missing."
      }
    );

  }


  if (!UCC) {

    return send(
      res,
      500,
      {
        success:
          false,

        step:
          "ENVIRONMENT",

        error:
          "NEO_UCC missing."
      }
    );

  }


  if (!MPIN) {

    return send(
      res,
      500,
      {
        success:
          false,

        step:
          "ENVIRONMENT",

        error:
          "NEO_MPIN missing."
      }
    );

  }


  // ========================================
  // TOTP
  // ========================================

  const totp =
    String(
      req.body?.totp ||
      ""
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
        success:
          false,

        step:
          "TOTP",

        error:
          "Current 6-digit TOTP required."
      }
    );

  }


  // ========================================
  // MPIN
  // ========================================

  if (
    !/^\d{6}$/.test(
      String(
        MPIN
      ).trim()
    )
  ) {

    return send(
      res,
      500,
      {
        success:
          false,

        step:
          "MPIN",

        error:
          "NEO_MPIN must be 6 digits."
      }
    );

  }


  // ========================================
  // MOBILE
  // ========================================

  const mobileNumber =
    normalizeMobile(
      MOBILE
    );


  if (
    !/^\+91\d{10}$/.test(
      mobileNumber
    )
  ) {

    return send(
      res,
      500,
      {
        success:
          false,

        step:
          "MOBILE",

        error:
          "NEO_MOBILE must be a valid Indian mobile number."
      }
    );

  }


  try {

    // ======================================
    // STEP 1
    // ======================================

    const login =
      await loginWithTotp(
        mobileNumber,
        totp
      );


    // ======================================
    // STEP 2
    // ======================================

    const session =
      await validateMpin(
        login.sid,
        login.auth
      );


    // ======================================
    // STEP 3
    // ======================================

    const csvText =
      await downloadScripmaster();


    // ======================================
    // STEP 4
    // ======================================

    const master =
      buildSymbolMap(
        csvText
      );


    const resolved =
      [];

    const missing =
      [];


    for (
      const symbol
      of NIFTY_50
    ) {

      if (
        master.map[symbol]
      ) {

        resolved.push(
          master.map[symbol]
        );

      } else {

        missing.push(
          symbol
        );

      }

    }


    // ======================================
    // NO SYMBOLS
    // ======================================

    if (
      resolved.length === 0
    ) {

      return send(
        res,
        502,
        {

          success:
            false,

          step:
            "SCRIPMASTER",

          error:
            "No Nifty 50 Neo symbols were resolved from Scripmaster.",

          requestedCount:
            NIFTY_50.length,

          resolvedCount:
            0,

          missingSymbols:
            missing

        }
      );

    }


    // ======================================
    // STEP 5 - QUOTES
    // ======================================

    const neoSymbols =
      resolved.map(
        item =>
          item.neoSymbol
      );


    const quoteResult =
      await getQuotes(
        session.baseUrl,
        session.sid,
        session.auth,
        neoSymbols
      );


    if (
      !quoteResult.success
    ) {

      return send(
        res,
        502,
        {

          success:
            false,

          source:
            "KOTAK NEO",

          step:
            "QUOTES",

          error:
            quoteResult.error,

          status:
            quoteResult.status,

          requestedCount:
            NIFTY_50.length,

          resolvedCount:
            resolved.length,

          missingSymbols:
            missing,

          resolvedSymbols:
            resolved,

          kotakResponse:
            quoteResult.kotakResponse,

          rawResponse:
            quoteResult.rawResponse

        }
      );

    }


    // ======================================
    // EXTRACT QUOTES
    // ======================================

    const kotakData =
      quoteResult.data;


    let quotes = [];


    if (
      Array.isArray(
        kotakData
      )
    ) {

      quotes =
        kotakData;

    }

    else if (
      Array.isArray(
        kotakData?.data
      )
    ) {

      quotes =
        kotakData.data;

    }

    else if (
      Array.isArray(
        kotakData?.quotes
      )
    ) {

      quotes =
        kotakData.quotes;

    }

    else if (
      Array.isArray(
        kotakData?.result
      )
    ) {

      quotes =
        kotakData.result;

    }

    else if (
      Array.isArray(
        kotakData?.results
      )
    ) {

      quotes =
        kotakData.results;

    }


    // ======================================
    // FINAL RESPONSE
    // ======================================

    if (
      quotes.length === 0
    ) {

      return send(
        res,
        502,
        {

          success:
            false,

          source:
            "KOTAK NEO",

          step:
            "QUOTES",

          error:
            "Kotak responded successfully but no quote array was found.",

          requestedCount:
            NIFTY_50.length,

          resolvedCount:
            resolved.length,

          missingSymbols:
            missing,

          resolvedSymbols:
            resolved,

          kotakResponse:
            kotakData

        }
      );

    }


    return send(
      res,
      200,
      {

        success:
          true,

        source:
          "KOTAK NEO",

        marketData:
          "LIVE",

        totalRequested:
          NIFTY_50.length,

        totalResolved:
          resolved.length,

        totalReceived:
          quotes.length,

        totalErrors:
          Math.max(
            NIFTY_50.length -
            quotes.length,
            0
          ),

        missingSymbols:
          missing,

        quotes:
          quotes

      }
    );


  } catch (error) {

    console.error(
      "Prototype-1 Quotes Error:",
      error
    );


    return send(
      res,
      500,
      {

        success:
          false,

        source:
          "KOTAK NEO",

        step:
          "QUOTES",

        error:
          error?.message ||
          "Unexpected server error."

      }
    );

  }

}
