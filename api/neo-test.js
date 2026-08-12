// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 BASE URL CHECK
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
        source: "KOTAK NEO V2",
        status: response.status,
        error: "Kotak returned non-JSON response.",
        rawResponse: rawText.substring(0, 1000)
      });

    }

    const baseUrl =
      data?.baseUrl ||
      data?.data?.baseUrl ||
      data?.data?.baseURL ||
      null;

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
        baseUrl
          ? "Actual Kotak Neo baseUrl received."
          : "baseUrl was not found in validation response."

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
