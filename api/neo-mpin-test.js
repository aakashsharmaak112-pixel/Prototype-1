// ============================================
// PROTOTYPE-1
// KOTAK NEO V2
// TOTP LOGIN + MPIN VALIDATION
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
    req.body?.totp;

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

  const mobile =
    String(MOBILE)
      .trim()
      .replace(/[\s-]/g, "");

  const mobileNumber =
    /^\d{10}$/.test(mobile)
      ? "+91" + mobile
      : mobile;

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
            String(TOTP)

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
        step: "TOTP LOGIN",
        kotakHttpStatus:
          loginResponse.status,
        error:
          "Kotak returned non-JSON response."
      });
    }

    if (!loginResponse.ok) {
      return res.status(loginResponse.status).json({
        success: false,
        step: "TOTP LOGIN",
        kotakHttpStatus:
          loginResponse.status,
        kotakResponse:
          loginData
      });
    }

    const session =
      loginData?.data || loginData;

    const sid =
      session?.sid ||
      session?.Sid;

    const auth =
      session?.token ||
      session?.Auth ||
      session?.auth;

    if (!sid || !auth) {
      return res.status(502).json({
        success: false,
        step: "TOTP LOGIN",
        error:
          "Kotak login succeeded but session credentials were not returned."
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
        step: "MPIN VALIDATION",
        kotakHttpStatus:
          validateResponse.status,
        error:
          "Kotak returned non-JSON response."
      });
    }

    const result =
      validateData?.data ||
      validateData;

    const baseUrl =
      result?.baseUrl ||
      result?.base_url ||
      null;

    const tradeSid =
      result?.sid ||
      result?.Sid ||
      null;

    const tradeToken =
      result?.token ||
      result?.Auth ||
      result?.auth ||
      null;

    return res.status(validateResponse.status).json({

      success:
        validateResponse.ok,

      source:
        "KOTAK NEO V2",

      step:
        "MPIN VALIDATION",

      kotakHttpStatus:
        validateResponse.status,

      baseUrlFound:
        Boolean(baseUrl),

      tradeSidFound:
        Boolean(tradeSid),

      tradeTokenFound:
        Boolean(tradeToken),

      baseUrl:
        baseUrl,

      tradeSidLength:
        tradeSid
          ? String(tradeSid).length
          : 0,

      tradeTokenLength:
        tradeToken
          ? String(tradeToken).length
          : 0,

      message:
        validateResponse.ok
          ? "TOTP + MPIN validation successful."
          : "MPIN validation failed.",

      kotakResponse:
        validateData
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
