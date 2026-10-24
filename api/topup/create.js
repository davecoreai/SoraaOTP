const { query } = require("../../lib/db");
const { transaction } = require("../../lib/db");
const { auth, method, readBody, send, fail } = require("../../lib/http");
const { createSnap, config } = require("../../lib/midtrans");
const crypto = require("node:crypto");
module.exports = async (req, res) => {
  if (!method(req, res, "POST")) return;
  const user = await auth(req);
  if (!user) return fail(res, 401, "Silakan login terlebih dahulu.");
  try {
    const body = await readBody(req);
    const amount = Number(body.amount);
    if (!Number.isSafeInteger(amount) || amount < 10000 || amount > 10000000) {
      return fail(res, 400, "Minimal topup Rp10.000 dan maksimal Rp10.000.000.");
    }
    const userRow = await query("SELECT name,email FROM users WHERE id=$1", [user.id]);
    if (!userRow.rows[0]) return fail(res, 404, "Akun tidak ditemukan.");
    const orderId = `SORA-${crypto.randomUUID()}`;
    await query(
      "INSERT INTO topups(user_id,amount,order_id) VALUES($1,$2,$3)",
      [user.id, amount, orderId]
    );
    const snap = await createSnap({ orderId, amount, email: userRow.rows[0].email, name: userRow.rows[0].name });
    await query("UPDATE topups SET midtrans_token=$1,redirect_url=$2 WHERE order_id=$3",
      [snap.token, snap.redirect_url, orderId]);
    return send(res, 201, {
      order_id: orderId,
      token: snap.token,
      redirect_url: snap.redirect_url,
      client_key: config().clientKey,
      production: config().production
    });
  } catch (e) {
    console.error("topup create", e.message);
    return fail(res, 502, e.message || "Gagal membuat pembayaran.");
  }
};
