// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 AUTH DEBUG
// api/neo-test.js
// ============================================

export default async function handler(req, res) {

  // ------------------------------------------
  // ONLY GET
  // ------------------------------------------

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
      error: "NEO_ACCESS_TOKEN is missing."
    });
  }

  if (!UCC) {
    return res.status(500).json({
      success: false,
      error: "NEO_UCC is missing."
    });
  }

  if (!MPIN) {
    return res.status(500).json({
      success: false,
      error: "NEO_MPIN is missing."
    });
  }

  // ------------------------------------------
  // KOTAK NEO V2 VALIDATION
  // ------------------------------------------

  try {

    const response = await fetch(
      "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": ACCESS_TOKEN
        },

        body: JSON.stringify({
          ucc: UCC,
          mpin: MPIN
        })
      }
    );

    // ----------------------------------------
    // READ RAW RESPONSE
    // ----------------------------------------

    const rawText =
      await response.text();

    // ----------------------------------------
    // PARSE JSON
    // ----------------------------------------

    let data = null;

    try {

      data =
        rawText
          ? JSON.parse(rawText)
          : null;

    } catch (parseError) {

      return res.status(200).json({

        success:
          false,

        source:
          "KOTAK NEO V2",

        kotakHttpStatus:
          response.status,

        responseType:
          "NON_JSON",

        error:
          "Kotak returned a non-JSON response.",

        rawResponse:
          rawText.substring(0, 3000)

      });

    }

    // ----------------------------------------
    // SEARCH BASE URL
    // ----------------------------------------

    const baseUrl =
      data?.baseUrl ||
      data?.baseURL ||
      data?.data?.baseUrl ||
      data?.data?.baseURL ||
      data?.data?.data?.baseUrl ||
      null;

    // ----------------------------------------
    // SAFE RESPONSE
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

      responseType:
        Array.isArray(data)
          ? "ARRAY"
          : typeof data,

      kotakResponse:
        data

    });

  } catch (error) {

    console.error(
      "Kotak Neo V2 Auth Debug Error:",
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
