// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 QUOTES
// api/quotes.js
// ============================================

const CONSUMER_KEY = String(
  process.env.NEO_CONSUMER_KEY ||
  ""
).trim();

const BASE_URL = String(
  process.env.NEO_BASE_URL ||
  ""
).trim().replace(/\/+$/, "");

function send(res, status, body) {
  return res.status(status).json(body);
}

async function requestJson(url, stage) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: CONSUMER_KEY,
        "Content-Type":
          "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    return {
      stage,
      url,
      httpStatus: response.status,
      ok: response.ok,
      response:
        data ||
        text.slice(0, 2000)
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
        String(error?.cause || "")
    };
  }
}

async function getScripMaster() {
  const url =
    BASE_URL +
    "/script-details/1.0/masterscrip/file-paths";

  return requestJson(
    url,
    "SCRIP_MASTER"
  );
}

async function getQuote(
  instrumentToken
) {
  const neoSymbol =
    "nse_cm|" +
    String(instrumentToken);

  const url =
    BASE_URL +
    "/script-details/1.0/quotes/neosymbol/" +
    encodeURIComponent(neoSymbol) +
    "/all";

  return requestJson(
    url,
    "QUOTE"
  );
}

async function run() {

  if (!CONSUMER_KEY) {
    return {
      success: false,
      step: "ENVIRONMENT",
      error:
        "NEO_CONSUMER_KEY missing."
    };
  }

  if (!BASE_URL) {
    return {
      success: false,
      step: "ENVIRONMENT",
      error:
        "NEO_BASE_URL missing."
    };
  }

  // ==========================================
  // 1. SCRIP MASTER
  // ==========================================

  const master =
    await getScripMaster();

  if (!master.ok) {
    return {
      success: false,
      step:
        "SCRIP_MASTER_FAILED",
      details: master
    };
  }

  // ==========================================
  // 2. RETURN RAW MASTER RESPONSE
  // ==========================================

  return {
    success: true,

    step:
      "SCRIP_MASTER_CONNECTED",

    baseUrl:
      BASE_URL,

    masterResponse:
      master.response
  };
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
        step: "METHOD",
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
          String(error)
      }
    );
  }
}
