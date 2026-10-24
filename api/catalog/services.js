const { nokos } = require("../../lib/nokos");
const { method, send, fail } = require("../../lib/http");
module.exports = async (req, res) => {
  if (!method(req, res, "GET")) return;
  try {
    const data = await nokos("/api/v1/services");
    return send(res, 200, { data });
  } catch (e) {
    console.error("catalog services", e.message);
    return fail(res, e.status || 502, e.message || "Gagal memuat katalog NokosPusat.");
  }
};
