// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// FINAL CHUNKED QUOTES FLOW
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
// KOTAK V2 LOGIN
// ============================================

const LOGIN_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

const VALIDATE_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";


// ============================================
// SCRIPMASTER
// ============================================

const SCRIPMASTER_URL =
  "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";


// ============================================
// QUOTES
// ============================================

const QUOTES_PATH =
  "/script-details/1.0/quotes/neosymbol/";


// ============================================
// CHUNK SIZE
// ============================================

const QUOTE_CHUNK_SIZE = 10;


// ============================================
// NIFTY 50
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

function send(
  res,
  status,
  body
) {

  return res
    .status(status)
    .json(body);

}


// ============================================
// READ RESPONSE
// ============================================

async function readResponse(
  response
) {

  const text =
    await response.text();

  let data = null;

  try {

    data =
      text
        ? JSON.parse(text)
        : null;

  } catch {

    data = null;

  }

  return {

    text,

    data

  };

}


// ============================================
// MOBILE NORMALIZER
// ============================================

function normalizeMobile(
  value
) {

  const mobile =
    String(value || "")
      .trim()
      .replace(
        /[^\d+]/g,
        ""
      );

  if (
    /^\d{10}$/.test(
      mobile
    )
  ) {

    return (
      "+91" +
      mobile
    );

  }

  return mobile;

}


// ============================================
// CSV PARSER
// ============================================

function parseCsvLine(
  line
) {

  const values = [];

  let current = "";

  let quoted = false;


  for (
    let i = 0;
    i < line.length;
    i++
  ) {

    const ch =
      line[i];


    if (
      ch === '"'
    ) {

      if (
        quoted &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      } else {

        quoted =
          !quoted;

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


// ============================================
// LOAD SCRIPMASTER
// ============================================

function loadSymbolMap(
  csvText
) {

  const lines =
    csvText
      .split(/\r?\n/)
      .filter(Boolean);


  if (
    lines.length < 2
  ) {

    throw new Error(
      "SCRIPMASTER: CSV empty hai."
    );

  }


  const header =
    parseCsvLine(
      lines[0]
    );


  const iSymbol =
    header.indexOf(
      "pSymbol"
    );

  const iExchange =
    header.indexOf(
      "pExchSeg"
    );

  const iTrading =
    header.indexOf(
      "pTrdSymbol"
    );

  const iRef =
    header.indexOf(
      "pScripRefKey"
    );


  if (
    iSymbol < 0 ||
    iExchange < 0 ||
    iTrading < 0 ||
    iRef < 0
  ) {

    throw new Error(
      "SCRIPMASTER: Required fields missing."
    );

  }


  const map = {};


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
        .replace(
          /-EQ$/i,
          ""
        );


    const tradingSymbol =
      pTrdSymbol
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );


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

          pTrdSymbol,

          pScripRefKey

        };


        break;

      }

    }

  }


  return map;

}


// ============================================
// STEP 1
// TOTP LOGIN
// ============================================

async function kotakLogin(
  totp
) {

  const mobileNumber =
    normalizeMobile(
      MOBILE
    );


  if (
    !/^\+91\d{10}$/.test(
      mobileNumber
    )
  ) {

    throw new Error(
      "TOTP_LOGIN: NEO_MOBILE invalid hai."
    );

  }


  const response =
    await fetch(
      LOGIN_URL,
      {

        method:
          "POST",

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

            mobileNumber,

            ucc:
              String(
                UCC
              ).trim(),

            totp:
              String(
                totp
              ).trim()

          })

      }
    );


  const result =
    await readResponse(
      response
    );


  if (
    !result.data
  ) {

    throw new Error(
      "TOTP_LOGIN: Kotak non-JSON response. HTTP " +
      response.status
    );

  }


  if (
    !response.ok
  ) {

    const message =
      result
        .data
        ?.error?.[0]
        ?.message ||
      result
        .data
        ?.message ||
      "Kotak TOTP login failed.";


    throw new Error(
      "TOTP_LOGIN: " +
      message
    );

  }


  const root =
    result
      .data
      ?.data ||
    result.data;


  const sid =
    root?.sid ||
    root?.Sid ||
    root?.viewSid;


  const auth =
    root?.token ||
    root?.Auth ||
    root?.auth ||
    root?.viewToken;


  if (
    !sid ||
    !auth
  ) {

    throw new Error(
      "TOTP_LOGIN: Sid/Auth missing."
    );

  }


  return {

    sid:
      String(
        sid
      ),

    auth:
      String(
        auth
      )

  };

}


// ============================================
// STEP 2
// MPIN VALIDATION
// ============================================

async function kotakValidate(
  session
) {

  const response =
    await fetch(
      VALIDATE_URL,
      {

        method:
          "POST",

        headers: {

          Authorization:
            String(
              ACCESS_TOKEN
            ).trim(),

          "neo-fin-key":
            "neotradeapi",

          Sid:
            session.sid,

          Auth:
            session.auth,

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


  if (
    !result.data
  ) {

    throw new Error(
      "MPIN_VALIDATE: Kotak non-JSON response. HTTP " +
      response.status
    );

  }


  if (
    !response.ok
  ) {

    const message =
      result
        .data
        ?.error?.[0]
        ?.message ||
      result
        .data
        ?.message ||
      "Kotak MPIN validation failed.";


    throw new Error(
      "MPIN_VALIDATE: " +
      message
    );

  }


  const root =
    result
      .data
      ?.data ||
    result.data;


  const baseUrl =
    root?.baseUrl ||
    root?.base_url ||
    root?.BaseUrl ||
    root?.BaseURL;


  if (
    !baseUrl
  ) {

    throw new Error(
      "MPIN_VALIDATE: baseUrl missing."
    );

  }


  return {

    baseUrl:
      String(
        baseUrl
      ).replace(
        /\/+$/,
        ""
      )

  };

}


// ============================================
// STEP 3
// SCRIPMASTER
// ============================================

async function getScripmaster() {

  const response =
    await fetch(
      SCRIPMASTER_URL,
      {

        method:
          "GET",

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


  if (
    !response.ok
  ) {

    throw new Error(
      "SCRIPMASTER: download failed HTTP " +
      response.status
    );

  }


  if (
    !text.trim()
  ) {

    throw new Error(
      "SCRIPMASTER: empty response."
    );

  }


  return text;

}


// ============================================
// CHUNK ARRAY
// ============================================

function chunkArray(
  array,
  size
) {

  const result = [];


  for (
    let i = 0;
    i < array.length;
    i += size
  ) {

    result.push(
      array.slice(
        i,
        i + size
      )
    );

  }


  return result;

}


// ============================================
// STEP 4
// KOTAK QUOTES
// ============================================

async function getQuotes(
  baseUrl,
  resolved
) {

  const chunks =
    chunkArray(
      resolved,
      QUOTE_CHUNK_SIZE
    );


  const allQuotes = [];

  const failedChunks = [];


  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {

    const chunk =
      chunks[i];


    const neoSymbols =
      chunk.map(
        item =>
          item.neoSymbol
      );


    const encodedSymbols =
      encodeURIComponent(
        neoSymbols.join(",")
      );


    const quoteUrl =
      baseUrl +
      QUOTES_PATH +
      encodedSymbols +
      "/all";


    try {

      const response =
        await fetch(
          quoteUrl,
          {

            method:
              "GET",

            headers: {

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


      if (
        !result.data
      ) {

        failedChunks.push({

          chunk:
            i + 1,

          symbols:
            chunk.map(
              item =>
                item.symbol
            ),

          status:
            response.status,

          error:
            "Non-JSON response",

          rawResponse:
            result.text.slice(
              0,
              1000
            )

        });


        continue;

      }


      if (
        !response.ok
      ) {

        failedChunks.push({

          chunk:
            i + 1,

          symbols:
            chunk.map(
              item =>
                item.symbol
            ),

          status:
            response.status,

          error:
            "Kotak Quotes request failed",

          kotakResponse:
            result.data

        });


        continue;

      }


      let quotes = [];


      if (
        Array.isArray(
          result.data
        )
      ) {

        quotes =
          result.data;

      }

      else if (
        Array.isArray(
          result.data.data
        )
      ) {

        quotes =
          result.data.data;

      }

      else if (
        Array.isArray(
          result.data.result
        )
      ) {

        quotes =
          result.data.result;

      }


      allQuotes.push(
        ...quotes
      );


    } catch (error) {

      failedChunks.push({

        chunk:
          i + 1,

        symbols:
          chunk.map(
            item =>
              item.symbol
          ),

        status:
          0,

        error:
          error.message

      });

    }

  }


  return {

    quotes:
      allQuotes,

    failedChunks

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


  // ==========================================
  // ENVIRONMENT
  // ==========================================

  const missing = [];


  if (!ACCESS_TOKEN)
    missing.push(
      "NEO_ACCESS_TOKEN"
    );


  if (!MOBILE)
    missing.push(
      "NEO_MOBILE"
    );


  if (!UCC)
    missing.push(
      "NEO_UCC"
    );


  if (!MPIN)
    missing.push(
      "NEO_MPIN"
    );


  if (
    missing.length
  ) {

    return send(
      res,
      500,
      {

        success:
          false,

        step:
          "ENVIRONMENT",

        error:
          "Missing Kotak environment variables.",

        missing

      }
    );

  }


  // ==========================================
  // TOTP
  // ==========================================

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
          "TOTP_INPUT",

        error:
          "Current 6-digit TOTP required."

      }
    );

  }


  let step =
    "START";


  try {

    // ----------------------------------------
    // TOTP
    // ----------------------------------------

    step =
      "TOTP_LOGIN";


    const login =
      await kotakLogin(
        totp
      );


    // ----------------------------------------
    // MPIN
    // ----------------------------------------

    step =
      "MPIN_VALIDATE";


    const session =
      await kotakValidate(
        login
      );


    // ----------------------------------------
    // SCRIPMASTER
    // ----------------------------------------

    step =
      "SCRIPMASTER";


    const csv =
      await getScripmaster();


    // ----------------------------------------
    // SYMBOL MAP
    // ----------------------------------------

    step =
      "SYMBOL_MAPPING";


    const symbolMap =
      loadSymbolMap(
        csv
      );


    const resolved =
      NIFTY_50
        .map(
          symbol =>
            symbolMap[
              symbol
            ]
        )
        .filter(Boolean);


    const missingSymbols =
      NIFTY_50.filter(
        symbol =>
          !symbolMap[
            symbol
          ]
      );


    if (
      !resolved.length
    ) {

      return send(
        res,
        502,
        {

          success:
            false,

          source:
            "KOTAK NEO",

          step,

          error:
            "No Nifty 50 symbols resolved.",

          resolvedCount:
            0,

          missingSymbols

        }
      );

    }


    // ----------------------------------------
    // QUOTES
    // ----------------------------------------

    step =
      "QUOTES";


    const quoteResult =
      await getQuotes(
        session.baseUrl,
        resolved
      );


    // ----------------------------------------
    // ALL CHUNKS FAILED
    // ----------------------------------------

    if (
      quoteResult.quotes.length === 0
    ) {

      return send(
        res,
        502,
        {

          success:
            false,

          source:
            "KOTAK NEO",

          step,

          error:
            "All Kotak Quotes chunks failed.",

          requestedCount:
            resolved.length,

          receivedCount:
            0,

          missingSymbols,

          chunkSize:
            QUOTE_CHUNK_SIZE,

          totalChunks:
            Math.ceil(
              resolved.length /
              QUOTE_CHUNK_SIZE
            ),

          failedChunks:
            quoteResult.failedChunks

        }
      );

    }


    // ----------------------------------------
    // PARTIAL / FULL SUCCESS
    // ----------------------------------------

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
          quoteResult
            .quotes
            .length,

        missingSymbols,

        partialFailures:
          quoteResult
            .failedChunks
            .length,

        failedChunks:
          quoteResult
            .failedChunks,

        quotes:
          quoteResult
            .quotes

      }
    );


  } catch (error) {

    return send(
      res,
      502,
      {

        success:
          false,

        source:
          "KOTAK NEO",

        step,

        error:
          error?.message ||
          String(error)

      }
    );

  }

}
