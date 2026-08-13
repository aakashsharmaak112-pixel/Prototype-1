// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// FRESH TOTP + MPIN SESSION
// VERIFIED SCRIPMASTER pSymbol TEST
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

  const MOBILE =
    process.env.NEO_MOBILE;

  const UCC =
    process.env.NEO_UCC;

  const MPIN =
    process.env.NEO_MPIN;

  const TOTP =
    req.body?.totp;

  // ==========================================
  // ENV CHECK
  // ==========================================

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN missing."
    });
  }

  if (!MOBILE) {
    return res.status(500).json({
      success: false,
      error: "NEO_MOBILE missing."
    });
  }

  if (!UCC) {
    return res.status(500).json({
      success: false,
      error: "NEO_UCC missing."
    });
  }

  if (!MPIN) {
    return res.status(500).json({
      success: false,
      error: "NEO_MPIN missing."
    });
  }

  if (!/^\d{6}$/.test(String(TOTP || ""))) {
    return res.status(400).json({
      success: false,
      error: "Current 6-digit TOTP required."
    });
  }

  if (!/^\d{6}$/.test(String(MPIN).trim())) {
    return res.status(400).json({
      success: false,
      error: "NEO_MPIN must be 6 digits."
    });
  }

  // ==========================================
  // MOBILE
  // ==========================================

  let mobile =
    String(MOBILE)
      .trim()
      .replace(/[\s-]/g, "");

  if (/^\d{10}$/.test(mobile)) {
    mobile = "+91" + mobile;
  }

  if (!/^\+91\d{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      error: "Invalid NEO_MOBILE format."
    });
  }

  try {

    // ========================================
    // STEP 1
    // TOTP LOGIN
    // ========================================

    const loginUrl =
      "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

    const loginResponse =
      await fetch(loginUrl, {

        method: "POST",

        headers: {

          "Authorization":
            String(ACCESS_TOKEN).trim(),

          "neo-fin-key":
            "neotradeapi",

          "Content-Type":
            "application/json",

          "Accept":
            "application/json"
        },

        body: JSON.stringify({

          mobileNumber:
            mobile,

          ucc:
            String(UCC).trim(),

          totp:
            String(TOTP)

        })
      });

    const loginText =
      await loginResponse.text();

    let loginData;

    try {

      loginData =
        loginText
          ? JSON.parse(loginText)
          : null;

    } catch {

      return res.status(502).json({

        success: false,

        step:
          "TOTP LOGIN",

        kotakHttpStatus:
          loginResponse.status,

        error:
          "Kotak returned non-JSON response."

      });

    }

    if (!loginResponse.ok) {

      return res.status(loginResponse.status).json({

        success: false,

        step:
          "TOTP LOGIN",

        kotakHttpStatus:
          loginResponse.status,

        kotakResponse:
          loginData

      });

    }

    const loginSession =
      loginData?.data ||
      loginData;

    const viewSid =
      loginSession?.sid ||
      loginSession?.Sid;

    const viewToken =
      loginSession?.token ||
      loginSession?.Auth ||
      loginSession?.auth;

    if (!viewSid || !viewToken) {

      return res.status(502).json({

        success: false,

        step:
          "TOTP LOGIN",

        error:
          "TOTP login succeeded but session credentials were not returned."

      });

    }

    // ========================================
    // STEP 2
    // MPIN VALIDATION
    // ========================================

    const validateUrl =
      "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

    const validateResponse =
      await fetch(validateUrl, {

        method: "POST",

        headers: {

          "Authorization":
            String(ACCESS_TOKEN).trim(),

          "neo-fin-key":
            "neotradeapi",

          "Sid":
            String(viewSid).trim(),

          "Auth":
            String(viewToken).trim(),

          "Content-Type":
            "application/json",

          "Accept":
            "application/json"

        },

        body: JSON.stringify({

          mpin:
            String(MPIN).trim()

        })

      });

    const validateText =
      await validateResponse.text();

    let validateData;

    try {

      validateData =
        validateText
          ? JSON.parse(validateText)
          : null;

    } catch {

      return res.status(502).json({

        success: false,

        step:
          "MPIN VALIDATION",

        kotakHttpStatus:
          validateResponse.status,

        error:
          "Kotak returned non-JSON response."

      });

    }

    if (!validateResponse.ok) {

      return res.status(validateResponse.status).json({

        success: false,

        step:
          "MPIN VALIDATION",

        kotakHttpStatus:
          validateResponse.status,

        kotakResponse:
          validateData

      });

    }

    const tradeSession =
      validateData?.data ||
      validateData;

    const baseUrl =
      tradeSession?.baseUrl ||
      tradeSession?.base_url;

    const tradeSid =
      tradeSession?.sid ||
      tradeSession?.Sid;

    const tradeToken =
      tradeSession?.token ||
      tradeSession?.Auth ||
      tradeSession?.auth;

    if (!baseUrl || !tradeSid || !tradeToken) {

      return res.status(502).json({

        success: false,

        step:
          "MPIN VALIDATION",

        error:
          "Trade session credentials were not returned.",

        baseUrlFound:
          Boolean(baseUrl),

        tradeSidFound:
          Boolean(tradeSid),

        tradeTokenFound:
          Boolean(tradeToken)

      });

    }

    // ========================================
    // STEP 3
    // VERIFIED SCRIPMASTER EQUITY MAPPING
    //
    // HDFCBANK-EQ -> 1333
    // TCS-EQ      -> 11536
    // RELIANCE-EQ -> 2885
    // INFY-EQ     -> 1594
    // ========================================

    const stocks = [

      {
        symbol:
          "HDFCBANK-EQ",

        neoSymbol:
          "1333",

        pSymbol:
          "1333",

        pTrdSymbol:
          "HDFCBANK-EQ",

        pScripRefKey:
          "HDFCBANK",

        exchange:
          "nse_cm"
      },

      {
        symbol:
          "TCS-EQ",

        neoSymbol:
          "11536",

        pSymbol:
          "11536",

        pTrdSymbol:
          "TCS-EQ",

        pScripRefKey:
          "TCS",

        exchange:
          "nse_cm"
      },

      {
        symbol:
          "RELIANCE-EQ",

        neoSymbol:
          "2885",

        pSymbol:
          "2885",

        pTrdSymbol:
          "RELIANCE-EQ",

        pScripRefKey:
          "RELIANCE",

        exchange:
          "nse_cm"
      },

      {
        symbol:
          "INFY-EQ",

        neoSymbol:
          "1594",

        pSymbol:
          "1594",

        pTrdSymbol:
          "INFY-EQ",

        pScripRefKey:
          "INFY",

        exchange:
          "nse_cm"
      }

    ];

    // ========================================
    // STEP 4
    // LIVE QUOTE REQUEST
    // ========================================

    const quotes = [];

    const errors = [];

    for (const stock of stocks) {

      try {

        const quoteUrl =
          `${String(baseUrl).replace(/\/+$/, "")}` +
          `/script-details/1.0/quotes/` +
          `neosymbol/` +
          encodeURIComponent(stock.neoSymbol) +
          `/all`;

        const quoteResponse =
          await fetch(quoteUrl, {

            method:
              "GET",

            headers: {

              "Authorization":
                String(ACCESS_TOKEN).trim(),

              "Auth":
                String(tradeToken).trim(),

              "Sid":
                String(tradeSid).trim(),

              "neo-fin-key":
                "neotradeapi",

              "Accept":
                "application/json"

            }

          });

        const quoteText =
          await quoteResponse.text();

        let quoteData;

        try {

          quoteData =
            quoteText
              ? JSON.parse(quoteText)
              : null;

        } catch {

          quoteData = {

            rawResponse:
              quoteText.substring(
                0,
                1000
              )

          };

        }

        // ------------------------------------
        // HTTP ERROR
        // ------------------------------------

        if (!quoteResponse.ok) {

          errors.push({

            symbol:
              stock.symbol,

            neoSymbol:
              stock.neoSymbol,

            pSymbol:
              stock.pSymbol,

            status:
              quoteResponse.status,

            response:
              quoteData

          });

          continue;
        }

        // ------------------------------------
        // KOTAK FAULT RESPONSE
        // ------------------------------------

        if (
          quoteData?.fault
        ) {

          errors.push({

            symbol:
              stock.symbol,

            neoSymbol:
              stock.neoSymbol,

            pSymbol:
              stock.pSymbol,

            status:
              quoteData?.fault?.code ||
              quoteResponse.status,

            response:
              quoteData

          });

          continue;
        }

        // ------------------------------------
        // SUCCESS
        // ------------------------------------

        quotes.push({

          symbol:
            stock.symbol,

          neoSymbol:
            stock.neoSymbol,

          pSymbol:
            stock.pSymbol,

          pTrdSymbol:
            stock.pTrdSymbol,

          pScripRefKey:
            stock.pScripRefKey,

          exchange:
            stock.exchange,

          data:
            quoteData

        });

      } catch (error) {

        errors.push({

          symbol:
            stock.symbol,

          neoSymbol:
            stock.neoSymbol,

          pSymbol:
            stock.pSymbol,

          error:
            error.message ||
            "Quote request failed."

        });

      }

    }

    // ========================================
    // FINAL RESPONSE
    // ========================================

    return res.status(200).json({

      success:
        true,

      source:
        "KOTAK NEO LIVE",

      marketData:
        "LIVE",

      authentication:
        "TOTP + MPIN",

      mappingSource:
        "KOTAK NEO SCRIPMASTER",

      totalRequested:
        stocks.length,

      totalReceived:
        quotes.length,

      totalErrors:
        errors.length,

      quotes,

      errors

    });

  } catch (error) {

    return res.status(500).json({

      success:
        false,

      source:
        "KOTAK NEO LIVE",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
