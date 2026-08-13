// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// api/quotes.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Use GET method."
    });
  }

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const BASE_URL =
    process.env.NEO_BASE_URL;

  const SID =
    process.env.NEO_TRADE_SID;

  const AUTH =
    process.env.NEO_TRADE_TOKEN;

  if (!ACCESS_TOKEN || !BASE_URL || !SID || !AUTH) {
    return res.status(500).json({
      success: false,
      error: "Kotak trading session environment variables are missing."
    });
  }

  // ------------------------------------------
  // TEST SYMBOLS
  // ------------------------------------------

  const symbols = [
    "HDFCBANK-EQ",
    "RELIANCE-EQ",
    "TCS-EQ",
    "INFY-EQ"
  ];

  const results = [];
  const errors = [];

  try {

    for (const symbol of symbols) {

      try {

        const url =
          `${BASE_URL}/script-details/1.0/quotes/` +
          encodeURIComponent(symbol);

        const response =
          await fetch(url, {

            method: "GET",

            headers: {
              "Authorization":
                String(ACCESS_TOKEN).trim(),

              "Auth":
                String(AUTH).trim(),

              "Sid":
                String(SID).trim(),

              "neo-fin-key":
                "neotradeapi",

              "Content-Type":
                "application/json",

              "Accept":
                "application/json"
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
        } catch {
          data = rawText;
        }

        if (!response.ok) {

          errors.push({
            symbol,
            status: response.status,
            response: data
          });

          continue;
        }

        results.push({
          symbol,
          data
        });

      } catch (error) {

        errors.push({
          symbol,
          error:
            error.message ||
            "Request failed."
        });

      }
    }

    return res.status(200).json({

      success: true,

      source:
        "KOTAK NEO LIVE",

      totalRequested:
        symbols.length,

      totalReceived:
        results.length,

      totalErrors:
        errors.length,

      stocks:
        results,

      errors

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      source:
        "KOTAK NEO LIVE",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
