// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// api/quotes.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Use POST method."
    });
  }

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const BASE_URL =
    process.env.NEO_BASE_URL;

  const TOTP =
    String(req.body?.totp || "").trim();

  const SID =
    String(
      req.body?.sid ||
      process.env.NEO_SID ||
      ""
    ).trim();

  const AUTH =
    String(
      req.body?.auth ||
      process.env.NEO_AUTH ||
      ""
    ).trim();

  // ------------------------------------------
  // ENV
  // ------------------------------------------

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      source: "KOTAK NEO",
      error: "NEO_ACCESS_TOKEN missing."
    });
  }

  // ------------------------------------------
  // TOTP
  // ------------------------------------------

  if (!/^\d{6}$/.test(TOTP)) {
    return res.status(400).json({
      success: false,
      source: "KOTAK NEO",
      error: "Current 6-digit TOTP required."
    });
  }

  // ------------------------------------------
  // BASE URL
  // ------------------------------------------

  if (!BASE_URL) {
    return res.status(500).json({
      success: false,
      source: "KOTAK NEO",
      error:
        "NEO_BASE_URL missing. MPIN validation must provide the Kotak Neo baseUrl."
    });
  }

  // ------------------------------------------
  // QUOTES ENDPOINT
  // ------------------------------------------

  const quotesUrl =
    BASE_URL.replace(/\/+$/, "") +
    "/script-details/1.0/quotes/";

  try {

    console.log(
      "KOTAK QUOTES URL:",
      quotesUrl
    );

    // ----------------------------------------
    // KOTAK HEADERS
    // ----------------------------------------

    const headers = {
      "Authorization":
        String(ACCESS_TOKEN).trim(),

      "neo-fin-key":
        "neotradeapi",

      "Accept":
        "application/json",

      "Content-Type":
        "application/json"
    };

    // ----------------------------------------
    // SESSION HEADERS
    // ----------------------------------------

    if (SID) {
      headers["Sid"] = SID;
    }

    if (AUTH) {
      headers["Auth"] = AUTH;
    }

    // ----------------------------------------
    // QUOTES REQUEST
    // ----------------------------------------

    const response =
      await fetch(
        quotesUrl,
        {
          method: "POST",
          headers,
          cache: "no-store",
          body: JSON.stringify({
            totp: TOTP
          })
        }
      );

    const rawText =
      await response.text();

    let data = null;

    try {

      data =
        rawText
          ? JSON.parse(rawText)
          : null;

    } catch (error) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO",
        step: "QUOTES",
        status: response.status,
        error:
          "Kotak Neo returned non-JSON response.",
        rawResponse:
          rawText.substring(0, 2000)
      });

    }

    // ----------------------------------------
    // KOTAK ERROR
    // ----------------------------------------

    if (!response.ok) {

      return res.status(response.status).json({
        success: false,
        source: "KOTAK NEO",
        step: "QUOTES",
        status: response.status,
        error:
          "Kotak Neo Quotes request failed.",
        kotakResponse:
          data
      });

    }

    // ----------------------------------------
    // SUCCESS
    // ----------------------------------------

    return res.status(200).json({

      success: true,

      source:
        "KOTAK NEO",

      marketData:
        "LIVE",

      kotakResponse:
        data

    });

  } catch (error) {

    console.error(
      "Kotak Quotes error:",
      error
    );

    return res.status(500).json({

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
