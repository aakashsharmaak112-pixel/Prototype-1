// ============================================
// PROTOTYPE-1
// KOTAK NEO BASE URL DEBUG
// api/quotes.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const BASE_URL =
    process.env.NEO_BASE_URL;

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN is not configured."
    });
  }

  if (!BASE_URL) {
    return res.status(500).json({
      success: false,
      error: "NEO_BASE_URL is not configured."
    });
  }

  const cleanBaseUrl =
    BASE_URL.replace(/\/+$/, "");

  const quoteUrl =
    cleanBaseUrl +
    "/script-details/1.0/quotes/";

  return res.status(200).json({

    success: true,

    source:
      "KOTAK NEO",

    debug:
      true,

    configuredBaseUrl:
      cleanBaseUrl,

    quotesEndpoint:
      quoteUrl,

    note:
      "Base URL configuration check only. No Kotak API request was made.",

    tokenConfigured:
      true

  });

}
