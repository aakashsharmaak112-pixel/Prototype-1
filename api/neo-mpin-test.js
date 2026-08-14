// ============================================
// PROTOTYPE-1
// KOTAK NEO AUTH DIAGNOSTIC V3
// api/neo-mpin-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Use POST method."
    });
  }

  const ACCESS_TOKEN = process.env.NEO_ACCESS_TOKEN;
  const MOBILE = process.env.NEO_MOBILE;
  const UCC = process.env.NEO_UCC;
  const MPIN = process.env.NEO_MPIN;

  const TOTP =
    String(req.body?.totp || "").trim();

  // ------------------------------------------
  // ENVIRONMENT CHECK
  // ------------------------------------------

  const missing = [];

  if (!ACCESS_TOKEN) missing.push("NEO_ACCESS_TOKEN");
  if (!MOBILE) missing.push("NEO_MOBILE");
  if (!UCC) missing.push("NEO_UCC");
  if (!MPIN) missing.push("NEO_MPIN");

  if (missing.length) {
    return res.status(500).json({
      success: false,
      step: "ENVIRONMENT",
      error: "Missing environment variables.",
      missing
    });
  }

  // ------------------------------------------
  // INPUT VALIDATION
  // ------------------------------------------

  if (!/^\d{6}$/.test(TOTP)) {
    return res.status(400).json({
      success: false,
      step: "TOTP INPUT",
      error: "Current 6-digit TOTP required."
    });
  }

  if (!/^\d{6}$/.test(String(MPIN).trim())) {
    return res.status(400).json({
      success: false,
      step: "MPIN INPUT",
      error: "NEO_MPIN must be exactly 6 digits."
    });
  }

  // ------------------------------------------
  // MOBILE
  // ------------------------------------------

  const cleanMobile =
    String(MOBILE)
      .trim()
      .replace(/[^\d+]/g, "");

  let mobileNumber = cleanMobile;

  if (/^\d{10}$/.test(cleanMobile)) {
    mobileNumber = "+91" + cleanMobile;
  }

  if (!/^\+91\d{10}$/.test(mobileNumber)) {
    return res.status(400).json({
      success: false,
      step: "MOBILE",
      error: "Invalid mobile number format.",
      detectedLength: mobileNumber.length
    });
  }

  // ==========================================
  // STEP 1 — TOTP LOGIN
  // ==========================================

  const loginUrl =
    "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

  try {

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
            mobileNumber,

          ucc:
            String(UCC).trim(),

          totp:
            TOTP

        })

      });

    const loginRaw =
      await loginResponse.text();

    let loginData = null;

    try {

      loginData =
        loginRaw
          ? JSON.parse(loginRaw)
          : null;

    } catch {

      return res.status(502).json({

        success: false,

        step:
          "TOTP LOGIN",

        kotakHttpStatus:
          loginResponse.status,

        error:
          "Kotak returned non-JSON response.",

        rawResponse:
          loginRaw.slice(0, 1000)

      });

    }

    // ----------------------------------------
    // LOGIN FAILURE
    // ----------------------------------------

    if (!loginResponse.ok) {

      return res.status(loginResponse.status).json({

        success: false,

        step:
          "TOTP LOGIN",

        kotakHttpStatus:
          loginResponse.status,

        error:
          "Kotak TOTP login failed.",

        kotakResponse:
          loginData

      });

    }

    // ----------------------------------------
    // LOGIN RESPONSE STRUCTURE
    // ----------------------------------------

    const loginRoot =
      loginData?.data ||
      loginData;

    const sid =
      loginRoot?.sid ??
      loginRoot?.Sid ??
      loginRoot?.sessionId ??
      loginRoot?.sessionID ??
      loginRoot?.viewSid ??
      null;

    const auth =
      loginRoot?.Auth ??
      loginRoot?.auth ??
      loginRoot?.token ??
      loginRoot?.Token ??
      loginRoot?.viewToken ??
      null;

    // ----------------------------------------
    // LOGIN DIAGNOSTIC
    // ----------------------------------------

    if (!sid || !auth) {

      return res.status(502).json({

        success: false,

        step:
          "TOTP LOGIN",

        kotakHttpStatus:
          loginResponse.status,

        error:
          "TOTP response received but session fields were not detected.",

        responseType:
          Array.isArray(loginData)
            ? "array"
            : typeof loginData,

        rootKeys:
          loginRoot &&
          typeof loginRoot === "object"
            ? Object.keys(loginRoot)
            : [],

        topLevelKeys:
          loginData &&
          typeof loginData === "object"
            ? Object.keys(loginData)
            : [],

        kotakResponse:
          loginData

      });

    }

    // ==========================================
    // STEP 2 — MPIN VALIDATION
    // ==========================================

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
            String(sid).trim(),

          "Auth":
            String(auth).trim(),

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

    const validateRaw =
      await validateResponse.text();

    let validateData = null;

    try {

      validateData =
        validateRaw
          ? JSON.parse(validateRaw)
          : null;

    } catch {

      return res.status(502).json({

        success: false,

        step:
          "MPIN VALIDATION",

        kotakHttpStatus:
          validateResponse.status,

        error:
          "Kotak returned non-JSON response.",

        rawResponse:
          validateRaw.slice(0, 1000)

      });

    }

    const validateRoot =
      validateData?.data ||
      validateData;

    // ==========================================
    // FIND BASE URL
    // ==========================================

    const baseUrl =
      validateRoot?.baseUrl ??
      validateRoot?.base_url ??
      validateRoot?.BaseUrl ??
      validateRoot?.BaseURL ??
      null;

    const returnedSid =
      validateRoot?.sid ??
      validateRoot?.Sid ??
      validateRoot?.sessionId ??
      validateRoot?.sessionID ??
      sid ??
      null;

    const returnedAuth =
      validateRoot?.Auth ??
      validateRoot?.auth ??
      validateRoot?.token ??
      validateRoot?.Token ??
      auth ??
      null;

    // ==========================================
    // FINAL DIAGNOSTIC RESPONSE
    // ==========================================

    return res.status(
      validateResponse.ok ? 200 : validateResponse.status
    ).json({

      success:
        validateResponse.ok &&
        Boolean(baseUrl),

      source:
        "KOTAK NEO",

      step:
        "MPIN VALIDATION",

      kotakHttpStatus:
        validateResponse.status,

      baseUrlFound:
        Boolean(baseUrl),

      sidFound:
        Boolean(returnedSid),

      authFound:
        Boolean(returnedAuth),

      baseUrl:
        baseUrl || null,

      sidLength:
        returnedSid
          ? String(returnedSid).length
          : 0,

      authLength:
        returnedAuth
          ? String(returnedAuth).length
          : 0,

      responseType:
        Array.isArray(validateData)
          ? "array"
          : typeof validateData,

      rootKeys:
        validateRoot &&
        typeof validateRoot === "object"
          ? Object.keys(validateRoot)
          : [],

      kotakResponse:
        validateData

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      source:
        "KOTAK NEO",

      step:
        "SERVER",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
