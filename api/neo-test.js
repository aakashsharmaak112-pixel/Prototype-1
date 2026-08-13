// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 AUTH RAW DEBUG
// api/neo-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const UCC =
    process.env.NEO_UCC;

  const MPIN =
    process.env.NEO_MPIN;

  // ------------------------------------------
  // ENV CHECK
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

  try {

    // ----------------------------------------
    // KOTAK NEO V2 AUTH
    // ----------------------------------------

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
    // RAW RESPONSE
    // ----------------------------------------

    const rawText =
      await response.text();

    // ----------------------------------------
    // TRY JSON
    // ----------------------------------------

    let parsed = null;

    try {

      parsed =
        rawText
          ? JSON.parse(rawText)
          : null;

    } catch (error) {

      return res.status(200).json({

        success: false,

        source:
          "KOTAK NEO V2",

        kotakHttpStatus:
          response.status,

        responseType:
          "NON_JSON",

        rawResponse:
          rawText.substring(0, 5000)

      });

    }

    // ----------------------------------------
    // FIND BASE URL WITHOUT ASSUMING LOCATION
    // ----------------------------------------

    let baseUrl = null;

    function findBaseUrl(value) {

      if (!value || typeof value !== "object") {
        return null;
      }

      if (
        typeof value.baseUrl === "string"
      ) {
        return value.baseUrl;
      }

      if (
        typeof value.baseURL === "string"
      ) {
        return value.baseURL;
      }

      for (const key of Object.keys(value)) {

        const result =
          findBaseUrl(value[key]);

        if (result) {
          return result;
        }
      }

      return null;
    }

    baseUrl =
      findBaseUrl(parsed);

    // ----------------------------------------
    // RETURN KOTAK RESPONSE
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

      kotakResponse:
        parsed

    });

  } catch (error) {

    console.error(
      "Kotak Neo V2 Raw Debug Error:",
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
