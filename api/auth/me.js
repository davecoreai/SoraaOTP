const { query } = require("../../lib/db");
const { method, auth, send, fail, clearCookie } = require("../../lib/http");
module.exports = async (req, res) => {
  if (req.method === "DELETE") {
    clearCookie(res);
    return send(res, 200, { ok: true });
  }
  if (!method(req, res, "GET")) return;
  const user = await auth(req);
  if (!user) return fail(res, 401, "Silakan login terlebih dahulu.");
  try {
    const [wallet, orders, topups] = await Promise.all([
      query("SELECT balance FROM wallets WHERE user_id=$1", [user.id]),
      query("SELECT id,service_name,provider,country_name,quoted_price,number,otp_code,status,created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 8", [user.id]),
      query("SELECT id,amount,status,created_at,paid_at FROM topups WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5", [user.id])
    ]);
    return send(res, 200, {
      user: { id: user.id, name: user.name, email: user.email },
      balance: Number(wallet.rows[0]?.balance || 0),
      orders: orders.rows,
      topups: topups.rows
    });
  } catch (e) {
    console.error("me error", e.message);
    return fail(res, 500, "Gagal mengambil data akun.");
  }
};
