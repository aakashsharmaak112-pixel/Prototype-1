// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 AUTH / BASE URL TEST
// ============================================

export default async function handler(req, res) {

  try {

    // ------------------------------------------
    // ENVIRONMENT VARIABLES
    // ------------------------------------------

    const ACCESS_TOKEN =
      process.env.NEO_ACCESS_TOKEN;

    const UCC =
      process.env.NEO_UCC;

    const MPIN =
      process.env.NEO_MPIN;

    // ------------------------------------------
    // BASIC CHECK
    // ------------------------------------------

    if (!ACCESS_TOKEN) {

      return res.status(500).json({
        success: false,
        error: "NEO_ACCESS_TOKEN environment variable missing."
      });

    }

    if (!UCC) {

      return res.status(500).json({
        success: false,
        error: "NEO_UCC environment variable missing."
      });

    }

    if (!MPIN) {

      return res.status(500).json({
        success: false,
        error: "NEO_MPIN environment variable missing."
      });

    }

    // ------------------------------------------
    // KOTAK NEO V2 MPIN VALIDATION
    // ------------------------------------------

    const response = await fetch(
      "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",

          // Neo v2 uses the plain token.
          // DO NOT add "Bearer ".
          "Authorization": ACCESS_TOKEN
        },

        body: JSON.stringify({
          ucc: UCC,
          mpin: MPIN
        })
      }
    );

    // ------------------------------------------
    // READ RESPONSE SAFELY
    // ------------------------------------------

    const rawText =
      await response.text();

    let data = null;

    try {

      data =
        JSON.parse(rawText);

    } catch (parseError) {

      return res.status(502).json({
        success: false,
        status: response.status,
        error: "Kotak Neo returned a non-JSON response.",
        rawResponse: rawText.slice(0, 1000)
      });

    }

    // ------------------------------------------
    // FIND BASE URL
    // ------------------------------------------

    const baseUrl =
      data?.baseUrl ||
      data?.data?.baseUrl ||
      null;

    // ------------------------------------------
    // SUCCESS RESPONSE
    // ------------------------------------------

    return res.status(response.status).json({

      success:
        response.ok,

      status:
        response.status,

      source:
        "KOTAK NEO V2",

      message:
        response.ok
          ? "Neo MPIN validation completed."
          : "Neo MPIN validation failed.",

      baseUrl:
        baseUrl,

      neoResponse:
        data

    });

  } catch (error) {

    // ------------------------------------------
    // SERVER ERROR
    // ------------------------------------------

    return res.status(500).json({

      success: false,

      error:
        error.message

    });

  }

}
