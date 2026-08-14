// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// TOTP -> MPIN -> BASE URL -> LIVE QUOTES
// api/quotes.js
// ============================================

const LOGIN_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

const VALIDATE_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

const ACCESS_TOKEN =
  process.env.NEO_ACCESS_TOKEN;

const MOBILE =
  process.env.NEO_MOBILE;

const UCC =
  process.env.NEO_UCC;

const MPIN =
  process.env.NEO_MPIN;


// ============================================
// NIFTY 50 NEO SYMBOLS
// ============================================

const NEO_SYMBOLS = [
  "1333",
  "4963",
  "2885",
  "10604",
  "11483",
  "3045",
  "1594",
  "5900",
  "317",
  "2031",
  "25",
  "15083",
  "157",
  "236",
  "16669",
  "16675",
  "383",
  "694",
  "20374",
  "881",
  "910",
  "5097",
  "1232",
  "7229",
  "467",
  "1363",
  "1394",
  "1660",
  "11195",
  "11723",
  "18143",
  "1922",
  "10999",
  "22377",
  "11630",
  "17963",
  "2475",
  "14977",
  "4306",
  "3351",
  "3432",
  "3499",
  "11536",
  "13538",
  "3506",
  "1964",
  "11532",
  "3787",
  "1424"
];


// ============================================
// JSON HELPER
// ============================================

function sendJson(res, statusCode, body) {
  return res.status(statusCode).json(body);
}


// ============================================
// PARSE JSON RESPONSE
// ============================================

async function readJsonResponse(response) {

  const rawText =
    await response.text();

  let data = null;

  try {

    data =
      rawText
        ? JSON.parse(rawText)
        : null;

  } catch (error) {

    return {
      ok: false,
      nonJson: true,
      rawText,
      data: null
    };

  }

  return {
    ok: response.ok,
    nonJson: false,
    rawText,
    data
  };
}


// ============================================
// EXTRACT DATA OBJECT
// ============================================

function getDataObject(data) {

  if (
    data &&
    typeof data === "object" &&
    data.data &&
    typeof data.data === "object"
  ) {
    return data.data;
  }

  return data;
}


// ============================================
// EXTRACT QUOTES ARRAY
// ============================================

function extractQuotes(data) {

  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(data.quotes)
  ) {
    return data.quotes;
  }

  if (
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  if (
    Array.isArray(data.result)
  ) {
    return data.result;
  }

  if (
    Array.isArray(data.results)
  ) {
    return data.results;
  }

  return [];
}


// ============================================
// MOBILE NORMALIZER
// ============================================

function normalizeMobile(value) {

  const clean =
    String(value || "")
      .trim()
      .replace(/[\s-]/g, "");

  if (
    /^\d{10}$/.test(clean)
  ) {
    return "+91" + clean;
  }

  return clean;
}


// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {

  // ------------------------------------------
  // METHOD
  // ------------------------------------------

  if (req.method !== "POST") {

    return sendJson(res, 405, {

      success: false,

      error:
        "Use POST method."

    });

  }


  // ------------------------------------------
  // ENV CHECK
  // ------------------------------------------

  if (!ACCESS_TOKEN) {

    return sendJson(res, 500, {

      success: false,

      source:
        "KOTAK NEO",

      step:
        "ENVIRONMENT",

      error:
        "NEO_ACCESS_TOKEN missing."

    });

  }


  if (!MOBILE) {

    return sendJson(res, 500, {

      success: false,

      source:
        "KOTAK NEO",

      step:
        "ENVIRONMENT",

      error:
        "NEO_MOBILE missing."

    });

  }


  if (!UCC) {

    return sendJson(res, 500, {

      success: false,

      source:
        "KOTAK NEO",

      step:
        "ENVIRONMENT",

      error:
        "NEO_UCC missing."

    });

  }


  if (!MPIN) {

    return sendJson(res, 500, {

      success: false,

      source:
        "KOTAK NEO",

      step:
        "ENVIRONMENT",

      error:
        "NEO_MPIN missing."

    });

  }


  // ------------------------------------------
  // TOTP
  // ------------------------------------------

  const TOTP =
    String(
      req.body?.totp || ""
    ).trim();


  if (!/^\d{6}$/.test(TOTP)) {

    return sendJson(res, 400, {

      success: false,

      source:
        "KOTAK NEO",

      step:
        "TOTP",

      error:
        "Current 6-digit TOTP required."

    });

  }


  // ------------------------------------------
  // MOBILE
  // ------------------------------------------

  const mobileNumber =
    normalizeMobile(MOBILE);


  if (
    !/^\+91\d{10}$/.test(
      mobileNumber
    )
  ) {

    return sendJson(res, 400, {

      success: false,

      source:
        "KOTAK NEO",

      step:
        "TOTP LOGIN",

      error:
        "Invalid NEO_MOBILE format."

    });

  }


  try {

    // ========================================
    // STEP 1
    // TOTP LOGIN
    // ========================================

    const loginResponse =
      await fetch(
        LOGIN_URL,
        {

          method: "POST",

          headers: {

            "Authorization":
              String(
                ACCESS_TOKEN
              ).trim(),

            "neo-fin-key":
              "neotradeapi",

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body:
            JSON.stringify({

              mobileNumber:
                mobileNumber,

              ucc:
                String(
                  UCC
                ).trim(),

              totp:
                TOTP

            }),

          cache:
            "no-store"

        }
      );


    const login =
      await readJsonResponse(
        loginResponse
      );


    if (login.nonJson) {

      return sendJson(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        step:
          "TOTP LOGIN",

        kotakHttpStatus:
          loginResponse.status,

        error:
          "Kotak TOTP login returned non-JSON response.",

        rawResponse:
          String(
            login.rawText || ""
          ).substring(
            0,
            2000
          )

      });

    }


    if (!loginResponse.ok) {

      return sendJson(
        res,
        loginResponse.status,
        {

          success: false,

          source:
            "KOTAK NEO",

          step:
            "TOTP LOGIN",

          kotakHttpStatus:
            loginResponse.status,

          error:
            "Kotak TOTP login failed.",

          kotakResponse:
            login.data

        }
      );

    }


    const loginData =
      getDataObject(
        login.data
      );


    const sid =
      loginData?.sid ||
      loginData?.Sid ||
      null;


    const auth =
      loginData?.token ||
      loginData?.Auth ||
      loginData?.auth ||
      null;


    if (!sid || !auth) {

      return sendJson(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        step:
          "TOTP LOGIN",

        error:
          "TOTP login succeeded but Sid/Auth were not returned."

      });

    }


    // ========================================
    // STEP 2
    // MPIN VALIDATION
    // ========================================

    const validateResponse =
      await fetch(
        VALIDATE_URL,
        {

          method: "POST",

          headers: {

            "Authorization":
              String(
                ACCESS_TOKEN
              ).trim(),

            "neo-fin-key":
              "neotradeapi",

            "Sid":
              String(
                sid
              ).trim(),

            "Auth":
              String(
                auth
              ).trim(),

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body:
            JSON.stringify({

              mpin:
                String(
                  MPIN
                ).trim()

            }),

          cache:
            "no-store"

        }
      );


    const validation =
      await readJsonResponse(
        validateResponse
      );


    if (validation.nonJson) {

      return sendJson(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        step:
          "MPIN VALIDATION",

        kotakHttpStatus:
          validateResponse.status,

        error:
          "Kotak MPIN validation returned non-JSON response.",

        rawResponse:
          String(
            validation.rawText || ""
          ).substring(
            0,
            2000
          )

      });

    }


    if (!validateResponse.ok) {

      return sendJson(
        res,
        validateResponse.status,
        {

          success: false,

          source:
            "KOTAK NEO",

          step:
            "MPIN VALIDATION",

          kotakHttpStatus:
            validateResponse.status,

          error:
            "Kotak MPIN validation failed.",

          kotakResponse:
            validation.data

        }
      );

    }


    const validateData =
      getDataObject(
        validation.data
      );


    // ----------------------------------------
    // BASE URL
    // ----------------------------------------

    const baseUrl =
      validateData?.baseUrl ||
      validateData?.base_url ||
      null;


    if (!baseUrl) {

      return sendJson(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        step:
          "MPIN VALIDATION",

        error:
          "MPIN validation succeeded but Kotak did not return baseUrl."

      });

    }


    // ========================================
    // STEP 3
    // LIVE QUOTES
    // ========================================

    const encodedSymbols =
      encodeURIComponent(
        NEO_SYMBOLS.join(",")
      );


    const quotesUrl =
      String(baseUrl)
        .replace(/\/+$/, "") +
      "/script-details/1.0/quotes/neosymbol/" +
      encodedSymbols +
      "/all";


    console.log(
      "Kotak Neo Quotes URL:",
      quotesUrl
    );


    const quotesResponse =
      await fetch(
        quotesUrl,
        {

          method: "GET",

          headers: {

            "Authorization":
              String(
                ACCESS_TOKEN
              ).trim(),

            "Content-Type":
              "application/x-www-form-urlencoded",

            "Accept":
              "application/json"

          },

          cache:
            "no-store"

        }
      );


    const quotes =
      await readJsonResponse(
        quotesResponse
      );


    if (quotes.nonJson) {

      return sendJson(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        step:
          "QUOTES",

        kotakHttpStatus:
          quotesResponse.status,

        error:
          "Kotak Neo Quotes returned non-JSON response.",

        rawResponse:
          String(
            quotes.rawText || ""
          ).substring(
            0,
            2000
          )

      });

    }


    if (!quotesResponse.ok) {

      return sendJson(
        res,
        quotesResponse.status,
        {

          success: false,

          source:
            "KOTAK NEO",

          step:
            "QUOTES",

          kotakHttpStatus:
            quotesResponse.status,

          error:
            "Kotak Neo Quotes request failed.",

          kotakResponse:
            quotes.data

        }
      );

    }


    const quoteArray =
      extractQuotes(
        quotes.data
      );


    if (
      !quoteArray.length
    ) {

      return sendJson(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        step:
          "QUOTES",

        kotakHttpStatus:
          quotesResponse.status,

        error:
          "Kotak Neo responded successfully but no quote array was found.",

        kotakResponse:
          quotes.data

      });

    }


    // ========================================
    // FINAL RESPONSE
    // ========================================

    return sendJson(res, 200, {

      success: true,

      source:
        "KOTAK NEO",

      marketData:
        "LIVE",

      totalRequested:
        NEO_SYMBOLS.length,

      totalReceived:
        quoteArray.length,

      totalErrors:
        Math.max(
          NEO_SYMBOLS.length -
          quoteArray.length,
          0
        ),

      neoResponse:
        quoteArray,

      quotes:
        quoteArray

    });


  } catch (error) {

    console.error(
      "Kotak Neo Quotes Error:",
      error
    );


    return sendJson(res, 500, {

      success: false,

      source:
        "KOTAK NEO",

      step:
        "QUOTES",

      error:
        error?.message ||
        "Unexpected server error."

    });

  }

}
