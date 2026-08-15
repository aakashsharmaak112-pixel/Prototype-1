// ============================================
// PROTOTYPE-1
// KOTAK NEO V2
// DIRECT HDFCBANK QUOTE TEST
// api/quotes.js
// ============================================

const ACCESS_TOKEN = String(
  process.env.NEO_ACCESS_TOKEN || ""
).trim();

const BASE_URL = String(
  process.env.NEO_BASE_URL || ""
).trim().replace(/\/+$/, "");

// HDFCBANK-EQ
// Previously confirmed from Kotak response
const HDFCBANK_TOKEN = "1333";

function send(res, status, body) {
  return res.status(status).json(body);
}

async function getQuote() {
  const neoSymbol =
    "nse_cm|" + HDFCBANK_TOKEN;

  const url =
    BASE_URL +
    "/script-details/1.0/quotes/neosymbol/" +
    encodeURIComponent(neoSymbol) +
    "/all";

  try {
    const response = await fetch(url, {
      method: "GET",

      headers: {
        Authorization: ACCESS_TOKEN,

        "Content-Type":
          "application/x-www-form-urlencoded",

        Accept:
          "application/json"
      },

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
      success: true,

      url,

      neoSymbol,

      instrumentToken:
        HDFCBANK_TOKEN,

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
      success: false,

      url,

      neoSymbol,

      instrumentToken:
        HDFCBANK_TOKEN,

      error:
        error?.message ||
        String(error),

      cause:
        error?.cause?.message ||
        String(error?.cause || "")
    };
  }
}

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

  if (!ACCESS_TOKEN) {
    return send(
      res,
      500,
      {
        success: false,

        step:
          "ACCESS_TOKEN",

        error:
          "NEO_ACCESS_TOKEN missing."
      }
    );
  }

  if (!BASE_URL) {
    return send(
      res,
      500,
      {
        success: false,

        step:
          "BASE_URL",

        error:
          "NEO_BASE_URL missing."
      }
    );
  }

  const result =
    await getQuote();

  return send(
    res,
    result.ok
      ? 200
      : 502,
    {
      success:
        result.ok,

      step:
        result.ok
          ? "QUOTE_SUCCESS"
          : "QUOTE_FAILED",

      stock:
        "HDFCBANK",

      instrumentToken:
        HDFCBANK_TOKEN,

      baseUrl:
        BASE_URL,

      quote:
        result
    }
  );
}
