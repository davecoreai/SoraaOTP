const DEFAULT_BASE_URL = "https://soraotp.vercel.app";
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
  const baseUrl = String(process.env.BASE_URL || process.env.APP_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return res.status(200).json({ supabaseUrl, supabaseAnonKey, baseUrl });
};
