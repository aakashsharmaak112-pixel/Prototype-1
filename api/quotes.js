// ============================================
// PROTOTYPE-1
// KOTAK NEO V2
// SEARCH SCRIP -> QUOTE
// api/quotes.js
// ============================================

const AUTH_TOKEN = String(
  process.env.NEO_ACCESS_TOKEN ||
  process.env.NEO_TRADE_TOKEN ||
  ""
).trim();

const BASE_URL = String(
  process.env.NEO_BASE_URL ||
  ""
).trim().replace(/\/+$/, "");

function send(res, status, body) {
  return res.status(status).json(body);
}

async function request(
  url,
  method,
  body,
  stage
) {
  try {
    const response = await fetch(url, {
      method,

      headers: {
        Authorization: AUTH_TOKEN,
        "Content-Type":
          "application/x-www-form-urlencoded",
        Accept:
          "application/json"
      },

      ...(body
        ? {
            body:
              new URLSearchParams(body)
          }
        : {}),

      cache: "no-store"
    });

    const text =
      await response.text();

    let data = null;

    try {
      data =
        text
          ? JSON.parse(text)
          : null;
    } catch {}

    return {
      stage,
      url,
      httpStatus:
        response.status,
      ok:
        response.ok,
      response:
        data ||
        text.slice(0, 3000)
    };

  } catch (error) {
    return {
      stage,
      url,
      ok: false,
      error:
        error?.message ||
        String(error),

      cause:
        error?.cause?.message ||
        String(
          error?.cause || ""
        )
    };
  }
}

// ============================================
// SEARCH SCRIP
// ============================================

async function searchScrip() {

  const url =
    BASE_URL +
    "/script-details/1.0/search/scrip";

  return request(
    url,
    "POST",
    {
      exchange_segment:
        "nse_cm",

      symbol:
        "HDFCBANK",

      expiry:
        "",

      option_type:
        "",

      strike_price:
        ""
    },

    "SEARCH_SCRIP"
  );
}

// ============================================
// QUOTE
// ============================================

async function getQuote(
  instrumentToken
) {

  const neoSymbol =
    "nse_cm|" +
    String(
      instrumentToken
    );

  const url =
    BASE_URL +
    "/script-details/1.0/quotes/neosymbol/" +
    encodeURIComponent(
      neoSymbol
    ) +
    "/all";

  return request(
    url,
    "GET",
    null,
    "QUOTE"
  );
}

// ============================================
// MAIN
// ============================================

async function run() {

  if (!AUTH_TOKEN) {
    return {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_ACCESS_TOKEN / NEO_TRADE_TOKEN missing."
    };
  }

  if (!BASE_URL) {
    return {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_BASE_URL missing."
    };
  }

  // ------------------------------------------
  // 1. SEARCH HDFCBANK
  // ------------------------------------------

  const search =
    await searchScrip();

  if (!search.ok) {
    return {
      success: false,

      step:
        "SEARCH_SCRIP_FAILED",

      details:
        search
    };
  }

  // ------------------------------------------
  // 2. RETURN SEARCH RESULT FOR NOW
  // ------------------------------------------

  return {
    success: true,

    step:
      "SEARCH_SCRIP_SUCCESS",

    stock:
      "HDFCBANK",

    searchResponse:
      search.response
  };
}

// ============================================
// VERCEL HANDLER
// ============================================

export default async function handler(
  req,
  res
) {

  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return send(
      res,
      405,
      {
        success: false,

        step:
          "METHOD",

        error:
          "Use GET or POST method."
      }
    );
  }

  try {

    const result =
      await run();

    return send(
      res,
      result.success
        ? 200
        : 502,
      result
    );

  } catch (error) {

    return send(
      res,
      502,
      {
        success: false,

        step:
          "UNHANDLED_ERROR",

        error:
          error?.message ||
          String(error),

        cause:
          error?.cause?.message ||
          String(
            error?.cause || ""
          )
      }
    );
  }
}
