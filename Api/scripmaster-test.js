export default function handler(req, res) {
  res.status(200).json({
    success: true,
    message: "ScripMaster API is working",
    status: "TEST"
  });
}
