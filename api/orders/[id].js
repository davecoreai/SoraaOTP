const { query } = require("../../lib/db");
const { nokos } = require("../../lib/nokos");
const { auth, method, send, fail } = require("../../lib/http");
module.exports = async (req, res) => {
  if (!method(req, res, "GET")) return;
  const user = await auth(req);
  if (!user) return fail(res, 401, "Silakan login terlebih dahulu.");
  try {
    const id = String(req.query.id || "");
    const found = await query("SELECT * FROM orders WHERE id=$1 AND user_id=$2", [id,user.id]);
    const order = found.rows[0];
    if (!order) return fail(res, 404, "Order tidak ditemukan.");
    if (order.nokos_order_id && !["cancelled","expired","failed"].includes(order.status)) {
      try {
        const fresh = await nokos(`/api/v1/orders/${encodeURIComponent(order.nokos_order_id)}`);
        await query(
          "UPDATE orders SET status=$1,number=COALESCE($2,number),otp_code=COALESCE($3,otp_code),upstream_payload=$4,updated_at=NOW() WHERE id=$5 AND user_id=$6",
          [fresh.status || order.status,fresh.number || null,fresh.otp?.code || null,JSON.stringify(fresh),id,user.id]
        );
        return send(res, 200, { order: { ...order, status: fresh.status || order.status, number: fresh.number || order.number, otp_code: fresh.otp?.code || order.otp_code } });
      } catch (upstreamError) {
        console.error("order refresh", upstreamError.message);
      }
    }
    return send(res, 200, { order: { ...order, quoted_price: Number(order.quoted_price) } });
  } catch (e) {
    return fail(res, 500, "Gagal mengambil status order.");
  }
};
