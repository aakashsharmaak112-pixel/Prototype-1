// ============================================
// PROTOTYPE-1
// KOTAK NEO AUTH DIAGNOSTIC
// api/neo-mpin-test.js
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
    String(req.body?.totp || "").trim();

  // ------------------------------------------
  // ENV CHECK
  // ------------------------------------------

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

  if (!/^\d{6}$/.test(TOTP)) {
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

  // ------------------------------------------
  // MOBILE FORMAT
  // ------------------------------------------

  const cleanMobile =
    String(MOBILE)
      .trim()
      .replace(/[^\d+]/g, "");

  const mobileNumber =
    cleanMobile.startsWith("+")
      ? cleanMobile
      : "+91" + cleanMobile;

  if (!/^\+91\d{10}$/.test(mobileNumber)) {
    return res.status(400).json({
      success: false,
      error: "Invalid mobile number format."
    });
  }

  // ------------------------------------------
  // STEP 1: TOTP LOGIN
  // ------------------------------------------

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

    let loginData;

    try {

      loginData =
        JSON.parse(loginRaw);

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
          loginRaw.slice(0, 2000)

      });

    }

    // ----------------------------------------
    // IMPORTANT:
    // RETURN RAW TOTP RESPONSE
    // WITHOUT EXPOSING ACCESS TOKEN
    // ----------------------------------------

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

    const loginRoot =
      loginData?.data ||
      loginData;

    // ----------------------------------------
    // TRY ALL COMMON FIELD LOCATIONS
    // ----------------------------------------

    const sid =
      loginRoot?.sid ||
      loginRoot?.Sid ||
      loginRoot?.sessionId ||
      loginRoot?.sessionID ||
      loginRoot?.viewSid ||
      loginData?.sid ||
      loginData?.Sid ||
      null;

    const auth =
      loginRoot?.Auth ||
      loginRoot?.auth ||
      loginRoot?.token ||
      loginRoot?.Token ||
      loginRoot?.viewToken ||
      loginData?.Auth ||
      loginData?.auth ||
      loginData?.token ||
      null;

    // ----------------------------------------
    // IF LOGIN RESPONSE DOES NOT CONTAIN
    // SESSION CREDENTIALS
    // ----------------------------------------

    if (!sid || !auth) {

      return res.status(502).json({

        success: false,

        step:
          "TOTP LOGIN",

        kotakHttpStatus:
          loginResponse.status,

        error:
          "TOTP accepted but Sid/Auth fields were not found.",

        detectedFields:
          Object.keys(loginRoot || {}),

        kotakResponse:
          loginData

      });

    }

    // ------------------------------------------
    // STEP 2: MPIN VALIDATION
    // ------------------------------------------

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

    let validateData;

    try {

      validateData =
        JSON.parse(validateRaw);

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
          validateRaw.slice(0, 2000)

      });

    }

    const validateRoot =
      validateData?.data ||
      validateData;

    // ----------------------------------------
    // FIND BASE URL
    // ----------------------------------------

    const baseUrl =
      validateRoot?.baseUrl ||
      validateRoot?.base_url ||
      validateRoot?.BaseUrl ||
      validateRoot?.BaseURL ||
      null;

    const tradeSid =
      validateRoot?.sid ||
      validateRoot?.Sid ||
      validateRoot?.sessionId ||
      validateRoot?.sessionID ||
      sid ||
      null;

    const tradeAuth =
      validateRoot?.Auth ||
      validateRoot?.auth ||
      validateRoot?.token ||
      validateRoot?.Token ||
      auth ||
      null;

    // ----------------------------------------
    // SAFE RESULT
    // ----------------------------------------

    return res.status(
      validateResponse.ok
        ? 200
        : validateResponse.status
    ).json({

      success:
        validateResponse.ok &&
        Boolean(baseUrl),

      step:
        "MPIN VALIDATION",

      kotakHttpStatus:
        validateResponse.status,

      baseUrlFound:
        Boolean(baseUrl),

      sidFound:
        Boolean(tradeSid),

      authFound:
        Boolean(tradeAuth),

      baseUrl:
        baseUrl || null,

      sidLength:
        tradeSid
          ? String(tradeSid).length
          : 0,

      authLength:
        tradeAuth
          ? String(tradeAuth).length
          : 0,

      detectedFields:
        Object.keys(validateRoot || {}),

      message:
        validateResponse.ok
          ? "Kotak authentication response received."
          : "MPIN validation failed.",

      kotakResponse:
        validateData

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
