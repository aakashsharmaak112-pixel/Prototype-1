export default function handler(req, res) {
  res.status(200).json({
    success: true,
    project: "Prototype-1",
    backend: "ONLINE",
    broker: "NOT_CONNECTED",
    marketData: "TEST",
    message: "Secure backend is working"
  });
}
