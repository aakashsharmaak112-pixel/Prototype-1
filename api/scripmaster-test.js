// ============================================
// PROTOTYPE-1
// KOTAK NEO SCRIP MASTER INSPECTOR
// api/scripmaster-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const masterUrl =
    "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";

  try {

    const response = await fetch(masterUrl, {
      method: "GET",
      headers: {
        "Accept": "text/csv"
      }
    });

    const csvText = await response.text();

    if (!response.ok) {

      return res.status(response.status).json({
        success: false,
        source: "KOTAK NEO",
        error: "Scrip Master download failed.",
        status: response.status,
        rawResponse: csvText.substring(0, 3000)
      });

    }

    const lines =
      csvText
        .split(/\r?\n/)
        .filter(function(line) {
          return line.trim() !== "";
        });

    if (lines.length === 0) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO",
        error: "Scrip Master CSV is empty."
      });

    }

    return res.status(200).json({

      success: true,

      source: "KOTAK NEO",

      marketData: "SCRIPMASTER",

      file: "nse_cm-v1.csv",

      totalCsvLines: lines.length,

      header: lines[0],

      firstFiveRows: lines.slice(1, 6)

    });

  } catch (error) {

    console.error(
      "Scrip Master Inspector Error:",
      error
    );

    return res.status(500).json({

      success: false,

      source: "KOTAK NEO",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
