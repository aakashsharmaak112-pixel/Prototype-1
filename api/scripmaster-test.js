// ============================================
// PROTOTYPE-1
// KOTAK NEO SCRIP MASTER DEBUG
// api/scripmaster-test.js
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

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN is not configured."
    });
  }

  const url =
    "https://mis.kotaksecurities.com/script-details/1.0/masterscrip/file-paths";

  try {

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": ACCESS_TOKEN,
        "Accept": "application/json"
      }
    });

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
        error: "Kotak returned non-JSON response.",
        status: response.status,
        rawResponse: rawText.substring(0, 3000)
      });

    }

    return res.status(200).json({

      success:
        response.ok,

      source:
        "KOTAK NEO",

      kotakHttpStatus:
        response.status,

      requestMethod:
        "GET",

      requestUrl:
        url,

      rawKotakResponse:
        data

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      source:
        "KOTAK NEO",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
