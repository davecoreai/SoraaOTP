const BASE = (process.env.NOKOS_BASE_URL || "https://nokospusat.com").replace(/\/+$/, "");
async function nokos(path, options = {}) {
  if (!process.env.NOKOS_API_KEY) throw new Error("NOKOS_API_KEY belum dikonfigurasi.");
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.NOKOS_API_KEY}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload?.error?.message || payload?.message || `NokosPusat error ${response.status}`);
    err.status = response.status;
    err.code = payload?.error?.code;
    throw err;
  }
  return payload?.data ?? payload;
}
module.exports = { nokos };
