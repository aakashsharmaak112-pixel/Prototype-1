export default async function handler(req, res) {
  try {
    const stocks = [
      "RELIANCE",
      "HDFCBANK",
      "ICICIBANK",
      "INFY",
      "TCS",
      "ITC",
      "SBIN",
      "BHARTIARTL",
      "LT",
      "AXISBANK"
    ];

    return res.status(200).json({
      success: true,
      totalRequested: stocks.length,
      totalReceived: stocks.length,
      totalErrors: 0,
      stocks
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
