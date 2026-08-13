// ============================================
// PROTOTYPE-1
// KOTAK NEO LOGIN + MPIN VALIDATION
// api/neo-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const ACCESS_TOKEN = process.env.NEO_ACCESS_TOKEN;
  const MOBILE = process.env.NEO_MOBILE;
  const UCC = process.env.NEO_UCC;
  const MPIN = process.env.NEO_MPIN;
  const TOTP = process.env.NEO_TOTP;

  // ------------------------------------------
  // CHECK ENVIRONMENT VARIABLES
  // ------------------------------------------

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN is missing."
    });
  }

  if (!MOBILE) {
    return res.status(500).json({
      success: false,
      error: "NEO_MOBILE is missing."
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

  if (!TOTP) {
    return res.status(500).json({
      success: false,
      error: "NEO_TOTP is missing. Enter the current 6-digit TOTP."
    });
  }

  // ------------------------------------------
  // STEP 1 — LOGIN WITH TOTP
  // ------------------------------------------

  const loginUrl =
    "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

  try {

    const loginResponse = await fetch(
      loginUrl,
      {
        method: "POST",

        headers: {
          "Authorization": ACCESS_TOKEN,
          "neo-fin-key": "neotradeapi",
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          mobileNumber: MOBILE,
          ucc: UCC,
          totp: TOTP
        })
      }
    );

    const loginRaw = await loginResponse.text();

    let loginData = null;

    try {
      loginData = loginRaw
        ? JSON.parse(loginRaw)
        : null;
    } catch (error) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO V2",
        step: "TOTP LOGIN",
        kotakHttpStatus: loginResponse.status,
        error: "Kotak returned non-JSON response."
      });

    }

    if (!loginResponse.ok) {

      return res.status(loginResponse.status).json({
        success: false,
        source: "KOTAK NEO V2",
        step: "TOTP LOGIN",
        kotakHttpStatus: loginResponse.status,
        kotakResponse: loginData
      });

    }

    // ------------------------------------------
    // GET TOKEN + SID FROM LOGIN RESPONSE
    // ------------------------------------------

    const loginDataObject =
      loginData?.data || loginData;

    const viewToken =
      loginDataObject?.token ||
      loginDataObject?.viewToken ||
      null;

    const viewSid =
      loginDataObject?.sid ||
      loginDataObject?.viewSid ||
      null;

    if (!viewToken || !viewSid) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO V2",
        step: "TOTP LOGIN",
        error: "Login succeeded but token or sid was not found.",
        kotakResponse: loginData
      });

    }

    // ------------------------------------------
    // STEP 2 — VALIDATE MPIN
    // ------------------------------------------

    const validateUrl =
      "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

    const validateResponse = await fetch(
      validateUrl,
      {
        method: "POST",

        headers: {
          "Authorization": ACCESS_TOKEN,
          "neo-fin-key": "neotradeapi",
          "sid": viewSid,
          "Auth": viewToken,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          mpin: MPIN
        })
      }
    );

    const validateRaw =
      await validateResponse.text();

    let validateData = null;

    try {
      validateData = validateRaw
        ? JSON.parse(validateRaw)
        : null;
    } catch (error) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO V2",
        step: "MPIN VALIDATION",
        kotakHttpStatus: validateResponse.status,
        error: "Kotak returned non-JSON response."
      });

    }

    // ------------------------------------------
    // FIND BASE URL
    // ------------------------------------------

    const baseUrl =
      validateData?.baseUrl ||
      validateData?.data?.baseUrl ||
      null;

    // ------------------------------------------
    // FINAL RESPONSE
    // ------------------------------------------

    return res.status(validateResponse.status).json({

      success: validateResponse.ok,

      source: "KOTAK NEO V2",

      step: "LOGIN + MPIN VALIDATION",

      kotakHttpStatus:
        validateResponse.status,

      loginHttpStatus:
        loginResponse.status,

      baseUrl:
        baseUrl,

      baseUrlFound:
        Boolean(baseUrl),

      message:
        validateResponse.ok
          ? "Kotak Neo authentication completed."
          : "Kotak Neo MPIN validation failed.",

      // SECURITY:
      // token/sid values are NEVER returned.

      kotakResponse:
        validateData

    });

  } catch (error) {

    console.error(
      "Kotak Neo Authentication Error:",
      error
    );

    return res.status(500).json({

      success: false,

      source: "KOTAK NEO V2",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
