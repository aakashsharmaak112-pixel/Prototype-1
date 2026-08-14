// ============================================
// PROTOTYPE-1
// KOTAK NEO QUOTES DIAGNOSTIC
// api/quotes.js
//
// PURPOSE:
// Find the exact neosymbol format accepted by
// Kotak Neo before scaling to NIFTY 50.
// ============================================

const ACCESS_TOKEN = process.env.NEO_ACCESS_TOKEN;
const MOBILE = process.env.NEO_MOBILE;
const UCC = process.env.NEO_UCC;
const MPIN = process.env.NEO_MPIN;

const TEST_STOCKS = [
  {
    symbol: "HDFCBANK-EQ",
    pSymbol: "1333",
    pTrdSymbol: "HDFCBANK-EQ",
    pScripRefKey: "HDFCBANK",
    pExchSeg: "nse_cm"
  }
];

function json(res, status, body) {
  return res.status(status).json(body);
}

async function readResponse(response) {
  const text = await response.text();

  try {
    return {
      parsed: true,
      data: text ? JSON.parse(text) : null,
      raw: text
    };
  } catch {
    return {
      parsed: false,
      data: null,
      raw: text
    };
  }
}

async function loginWithTotp(totp) {
  const response = await fetch(
    "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin",
    {
      method: "POST",
      headers: {
        Authorization: String(ACCESS_TOKEN).trim(),
        "neo-fin-key": "neotradeapi",
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        mobileNumber: String(MOBILE).trim(),
        ucc: String(UCC).trim(),
        totp: String(totp)
      })
    }
  );

  const result = await readResponse(response);

  if (!response.ok) {
    return {
      success: false,
      step: "TOTP LOGIN",
      status: response.status,
      response: result.data || result.raw
    };
  }

  const session =
    result.data?.data ||
    result.data;

  const sid =
    session?.sid ||
    session?.Sid;

  const token =
    session?.token ||
    session?.Auth ||
    session?.auth;

  if (!sid || !token) {
    return {
      success: false,
      step: "TOTP LOGIN",
      error:
        "Login succeeded but Sid/Auth was not returned."
    };
  }

  return {
    success: true,
    sid,
    token
  };
}

async function validateMpin(sid, auth) {
  const response = await fetch(
    "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate",
    {
      method: "POST",
      headers: {
        Authorization: String(ACCESS_TOKEN).trim(),
        "neo-fin-key": "neotradeapi",
        Sid: String(sid).trim(),
        Auth: String(auth).trim(),
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        mpin: String(MPIN).trim()
      })
    }
  );

  const result = await readResponse(response);

  if (!response.ok) {
    return {
      success: false,
      step: "MPIN VALIDATION",
      status: response.status,
      response: result.data || result.raw
    };
  }

  const session =
    result.data?.data ||
    result.data;

  const baseUrl =
    session?.baseUrl ||
    session?.base_url;

  if (!baseUrl) {
    return {
      success: false,
      step: "MPIN VALIDATION",
      error:
        "baseUrl was not returned by Kotak."
    };
  }

  return {
    success: true,
    baseUrl
  };
}

async function tryQuote(baseUrl, candidate) {

  const url =
    `${String(baseUrl).replace(/\/+$/, "")}` +
    `/script-details/1.0/quotes/neosymbol/` +
    encodeURIComponent(candidate) +
    `/all`;

  const response = await fetch(
    url,
    {
      method: "GET",

      headers: {
        Authorization:
          String(ACCESS_TOKEN).trim(),

        Accept:
          "application/json",

        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      cache:
        "no-store"
    }
  );

  const result =
    await readResponse(response);

  const fault =
    result.data?.fault;

  return {

    candidate,

    httpStatus:
      response.status,

    accepted:
      response.ok &&
      !fault,

    response:
      result.data ||
      (
        result.raw
          ? result.raw.slice(
              0,
              1000
            )
          : null
      )

  };
}

export default async function handler(
  req,
  res
) {

  if (req.method !== "POST") {

    return json(
      res,
      405,
      {
        success: false,
        error:
          "Use POST with current 6-digit TOTP."
      }
    );

  }

  if (
    !ACCESS_TOKEN ||
    !MOBILE ||
    !UCC ||
    !MPIN
  ) {

    return json(
      res,
      500,
      {
        success: false,
        error:
          "Kotak Neo environment variables are incomplete."
      }
    );

  }

  const totp =
    String(
      req.body?.totp || ""
    ).trim();

  if (
    !/^\d{6}$/.test(
      totp
    )
  ) {

    return json(
      res,
      400,
      {
        success: false,
        error:
          "Current 6-digit TOTP required."
      }
    );

  }

  try {

    // ========================================
    // TOTP LOGIN
    // ========================================

    const login =
      await loginWithTotp(
        totp
      );

    if (!login.success) {
      return json(
        res,
        502,
        login
      );
    }


    // ========================================
    // MPIN VALIDATION
    // ========================================

    const validation =
      await validateMpin(
        login.sid,
        login.token
      );

    if (
      !validation.success
    ) {

      return json(
        res,
        502,
        validation
      );

    }


    // ========================================
    // TEST HDFCBANK ONLY
    // ========================================

    const stock =
      TEST_STOCKS[0];


    // ========================================
    // CANDIDATE FORMATS
    // ========================================

    const candidates = [

      stock.pSymbol,

      stock.pTrdSymbol,

      stock.pScripRefKey,

      `${stock.pExchSeg}|${stock.pSymbol}`,

      `${stock.pExchSeg}:${stock.pSymbol}`,

      `${stock.pExchSeg}/${stock.pSymbol}`,

      `${stock.pExchSeg}-${stock.pSymbol}`,

      `${stock.pExchSeg}|${stock.pTrdSymbol}`,

      `${stock.pExchSeg}:${stock.pTrdSymbol}`,

      `${stock.pExchSeg}/${stock.pTrdSymbol}`,

      `${stock.pExchSeg}-${stock.pTrdSymbol}`,

      `${stock.pExchSeg}|${stock.pScripRefKey}`,

      `${stock.pExchSeg}:${stock.pScripRefKey}`,

      `${stock.pExchSeg}/${stock.pScripRefKey}`,

      `${stock.pExchSeg}-${stock.pScripRefKey}`

    ];


    const tests = [];


    // ========================================
    // TEST ONE-BY-ONE
    // ========================================

    for (
      const candidate
      of candidates
    ) {

      const result =
        await tryQuote(
          validation.baseUrl,
          candidate
        );

      tests.push(
        result
      );


      // FIRST ACCEPTED VALUE
      if (
        result.accepted
      ) {

        return json(
          res,
          200,
          {

            success:
              true,

            source:
              "KOTAK NEO",

            test:
              "NEOSYMBOL FORMAT DIAGNOSTIC",

            symbol:
              stock.symbol,

            acceptedCandidate:
              result,

            tests:
              tests

          }
        );

      }

    }


    // ========================================
    // NOTHING ACCEPTED
    // ========================================

    return json(
      res,
      200,
      {

        success:
          true,

        source:
          "KOTAK NEO",

        test:
          "NEOSYMBOL FORMAT DIAGNOSTIC",

        symbol:
          stock.symbol,

        acceptedCandidate:
          null,

        tests:
          tests

      }
    );

  }

  catch (error) {

    return json(
      res,
      500,
      {

        success:
          false,

        source:
          "KOTAK NEO",

        error:
          error?.message ||
          "Unexpected server error."

      }
    );

  }

}
