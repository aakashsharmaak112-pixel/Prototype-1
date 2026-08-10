export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol || "RELIANCE-EQ";

    return res.status(200).json({
      success: true,
      symbol,
      message: "Quotes API is working",
      marketData: "TEST"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
