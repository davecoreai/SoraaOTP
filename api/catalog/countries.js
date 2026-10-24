const { nokos } = require("../../lib/nokos");
const { method, send, fail } = require("../../lib/http");
module.exports = async (req, res) => {
  if (!method(req, res, "GET")) return;
  const service = String(req.query.service || "");
  const provider = String(req.query.provider || "provider_1");
  if (!service) return fail(res, 400, "Parameter service wajib diisi.");
  if (!["provider_1","provider_2","provider_3"].includes(provider)) return fail(res, 400, "Provider tidak valid.");
  try {
    const data = await nokos(`/api/v1/services/${encodeURIComponent(service)}/countries?provider=${provider}`);
    return send(res, 200, { data });
  } catch (e) {
    return fail(res, e.status || 502, e.message || "Gagal memuat negara.");
  }
};
