export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    service: 'CODESTORM 2026 API',
    timestamp: new Date().toISOString()
  });
}
