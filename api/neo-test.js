// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 MPIN VALIDATION
// api/neo-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const ACCESS_TOKEN = process.env.NEO_ACCESS_TOKEN;
  const MPIN = process.env.NEO_MPIN;
  const VIEW_SID = process.env.NEO_VIEW_SID;
  const VIEW_TOKEN = process.env.NEO_VIEW_TOKEN;

  // ------------------------------------------
  // ENV CHECK
  // ------------------------------------------

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN missing."
    });
  }

  if (!MPIN) {
    return res.status(500).json({
      success: false,
      error: "NEO_MPIN missing."
    });
  }

  if (!VIEW_SID) {
    return res.status(500).json({
      success: false,
      error: "NEO_VIEW_SID missing."
    });
  }

  if (!VIEW_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_VIEW_TOKEN missing."
    });
  }

  // ------------------------------------------
  // KOTAK NEO VALIDATION
  // ------------------------------------------

  const url =
    "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

  try {

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Authorization": String(ACCESS_TOKEN).trim(),
        "neo-fin-key": "neotradeapi",
        "sid": String(VIEW_SID).trim(),
        "Auth": String(VIEW_TOKEN).trim(),
        "Content-Type": "application/json",
        "Accept": "application/json"
      },

      body: JSON.stringify({
        mpin: String(MPIN).trim()
      })
    });

    const rawText = await response.text();

    let data = null;

    try {
      data = rawText
        ? JSON.parse(rawText)
        : null;
    } catch (error) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO V2",
        step: "MPIN VALIDATION",
        kotakHttpStatus: response.status,
        error: "Kotak returned non-JSON response.",
        rawResponse: rawText.slice(0, 2000)
      });

    }

    // ------------------------------------------
    // BASE URL
    // ------------------------------------------

    const baseUrl =
      data?.baseUrl ||
      data?.data?.baseUrl ||
      data?.data?.base_url ||
      null;

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(response.status).json({

      success: response.ok,

      source:
        "KOTAK NEO V2",

      step:
        "MPIN VALIDATION",

      kotakHttpStatus:
        response.status,

      baseUrl:
        baseUrl,

      baseUrlFound:
        Boolean(baseUrl),

      message:
        response.ok
          ? "Neo MPIN validation successful."
          : "Neo MPIN validation failed.",

      kotakResponse:
        data

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      source:
        "KOTAK NEO V2",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
