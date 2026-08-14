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
    String(req.body?.totp || "").trim();

  // ------------------------------------------
  // ENVIRONMENT CHECK
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
  // MOBILE NORMALIZATION
  // ------------------------------------------

  const cleanMobile =
    String(MOBILE)
      .trim()
      .replace(/[\s-]/g, "");

  const mobileNumber =
    /^\d{10}$/.test(cleanMobile)
      ? "+91" + cleanMobile
      : cleanMobile;

  if (!/^\+91\d{10}$/.test(mobileNumber)) {
    return res.status(400).json({
      success: false,
      error: "Invalid mobile number format."
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
      await fetch(
        loginUrl,
        {
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

          body:
            JSON.stringify({

              mobileNumber:
                mobileNumber,

              ucc:
                String(UCC).trim(),

              totp:
                TOTP

            })
        }
      );

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
        step: "TOTP LOGIN",
        kotakHttpStatus:
          loginResponse.status,
        error:
          "Kotak TOTP login returned non-JSON response."
      });

    }

    if (!loginResponse.ok) {

      return res.status(
        loginResponse.status
      ).json({

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
    // LOGIN SESSION
    // ----------------------------------------

    const loginSession =
      loginData?.data ||
      loginData;

    const sid =
      loginSession?.sid ||
      loginSession?.Sid ||
      loginSession?.viewSid ||
      null;

    const auth =
      loginSession?.token ||
      loginSession?.Auth ||
      loginSession?.auth ||
      loginSession?.viewToken ||
      null;

    if (!sid || !auth) {

      return res.status(502).json({

        success: false,

        step:
          "TOTP LOGIN",

        error:
          "TOTP login succeeded but SID/Auth was not returned."

      });

    }

    // ========================================
    // STEP 2
    // MPIN VALIDATION
    // ========================================

    const validateUrl =
      "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

    const validateResponse =
      await fetch(
        validateUrl,
        {
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

          body:
            JSON.stringify({

              mpin:
                String(MPIN).trim()

            })
        }
      );

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
          "Kotak MPIN validation returned non-JSON response."

      });

    }

    if (!validateResponse.ok) {

      return res.status(
        validateResponse.status
      ).json({

        success: false,

        step:
          "MPIN VALIDATION",

        kotakHttpStatus:
          validateResponse.status,

        error:
          "Kotak MPIN validation failed.",

        kotakResponse:
          validateData

      });

    }

    // ----------------------------------------
    // MPIN RESPONSE
    // ----------------------------------------

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
      sid;

    const tradeToken =
      result?.token ||
      result?.Auth ||
      result?.auth ||
      auth;

    if (!baseUrl) {

      return res.status(502).json({

        success: false,

        step:
          "MPIN VALIDATION",

        error:
          "MPIN succeeded but Kotak did not return baseUrl.",

        kotakResponse:
          validateData

      });

    }

    // ----------------------------------------
    // DO NOT EXPOSE SESSION CREDENTIALS
    // ----------------------------------------

    return res.status(200).json({

      success: true,

      source:
        "KOTAK NEO V2",

      step:
        "MPIN VALIDATION",

      kotakHttpStatus:
        validateResponse.status,

      baseUrlFound:
        true,

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
        "TOTP + MPIN validation successful.",

      // INTERNAL VALUES ARE NOT RETURNED
      sessionReady:
        Boolean(
          tradeSid &&
          tradeToken &&
          baseUrl
        )

    });

  } catch (error) {

    console.error(
      "KOTAK NEO AUTH ERROR:",
      error
    );

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
