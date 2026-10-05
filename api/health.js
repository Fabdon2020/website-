// GET /api/health: confirms the backend runs and which keys are configured.
// Only reports true/false per key; never returns key values.
const KEYS = [
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'YOCO_SECRET_KEY', 'YOCO_WEBHOOK_SECRET', 'BREVO_API_KEY', 'ENCRYPTION_KEY', 'APP_URL',
];

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'axious-office',
    configured: Object.fromEntries(KEYS.map((k) => [k, Boolean(process.env[k])])),
  });
}
