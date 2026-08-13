// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 TRADE API VALIDATION
// api/neo-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  // ------------------------------------------
  // ENVIRONMENT VARIABLES
  // ------------------------------------------

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const VIEW_SID =
    process.env.NEO_VIEW_SID;

  const VIEW_TOKEN =
    process.env.NEO_VIEW_TOKEN;

  const MPIN =
    process.env.NEO_MPIN;

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN is missing."
    });
  }

  if (!VIEW_SID) {
    return res.status(500).json({
      success: false,
      error: "NEO_VIEW_SID is missing."
    });
  }

  if (!VIEW_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_VIEW_TOKEN is missing."
    });
  }

  if (!MPIN) {
    return res.status(500).json({
      success: false,
      error: "NEO_MPIN is missing."
    });
  }

  try {

    // ----------------------------------------
    // KOTAK NEO V2 tradeApiValidate
    // PDF FLOW:
    //
    // Authorization = access_token
    // neo-fin-key   = neotradeapi
    // sid           = viewSid
    // Auth          = viewToken
    // body          = mpin
    // ----------------------------------------

    const response = await fetch(
      "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate",
      {
        method: "POST",

        headers: {
          "Authorization": ACCESS_TOKEN,
          "neo-fin-key": "neotradeapi",
          "sid": VIEW_SID,
          "Auth": VIEW_TOKEN,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          mpin: MPIN
        })
      }
    );

    // ----------------------------------------
    // READ RESPONSE
    // ----------------------------------------

    const rawText =
      await response.text();

    let data = null;

    try {

      data =
        rawText
          ? JSON.parse(rawText)
          : null;

    } catch (error) {

      return res.status(200).json({
        success: false,
        source: "KOTAK NEO V2",
        kotakHttpStatus: response.status,
        responseType: "NON_JSON",
        rawResponse: rawText.substring(0, 5000)
      });

    }

    // ----------------------------------------
    // FIND BASE URL
    // ----------------------------------------

    const baseUrl =
      data?.baseUrl ||
      data?.baseURL ||
      data?.data?.baseUrl ||
      data?.data?.baseURL ||
      null;

    // ----------------------------------------
    // SAFE RESULT
    // ----------------------------------------

    return res.status(200).json({

      success:
        response.ok,

      source:
        "KOTAK NEO V2",

      kotakHttpStatus:
        response.status,

      baseUrl:
        baseUrl,

      baseUrlFound:
        Boolean(baseUrl),

      message:
        response.ok
          ? "Neo MPIN validation completed."
          : "Neo MPIN validation failed.",

      kotakResponse:
        data

    });

  } catch (error) {

    console.error(
      "Kotak Neo V2 Validation Error:",
      error
    );

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
