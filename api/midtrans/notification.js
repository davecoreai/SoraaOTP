const { query, transaction } = require("../../lib/db");
const { method, readBody, send, fail } = require("../../lib/http");
const { verifyNotification } = require("../../lib/midtrans");
module.exports = async (req, res) => {
  if (!method(req, res, "POST")) return;
  try {
    const body = await readBody(req);
    if (!verifyNotification(body)) return fail(res, 403, "Signature Midtrans tidak valid.");
    const status = String(body.transaction_status || "");
    const fraud = String(body.fraud_status || "");
    let nextStatus = "pending";
    if (status === "settlement" || (status === "capture" && fraud === "accept")) nextStatus = "paid";
    else if (["deny","cancel"].includes(status)) nextStatus = "failed";
    else if (status === "expire") nextStatus = "expired";

    await transaction(async client => {
      const found = await client.query("SELECT * FROM topups WHERE order_id=$1 FOR UPDATE", [body.order_id]);
      const topup = found.rows[0];
      if (!topup) throw new Error("Topup tidak ditemukan.");
      if (topup.status === "paid") return;
      if (nextStatus === "paid") {
        if (Number(body.gross_amount) !== Number(topup.amount)) throw new Error("Nominal pembayaran tidak cocok.");
        await client.query("UPDATE topups SET status='paid',paid_at=NOW() WHERE id=$1", [topup.id]);
        await client.query("UPDATE wallets SET balance=balance+$1,updated_at=NOW() WHERE user_id=$2", [topup.amount,topup.user_id]);
        await client.query(
          "INSERT INTO wallet_ledger(user_id,amount,kind,reference,description) VALUES($1,$2,'topup',$3,$4) ON CONFLICT(reference) DO NOTHING",
          [topup.user_id, topup.amount, `topup:${topup.id}`, `Topup Midtrans ${topup.order_id}`]
        );
      } else if (nextStatus !== "pending") {
        await client.query("UPDATE topups SET status=$1 WHERE id=$2 AND status='pending'", [nextStatus,topup.id]);
      }
    });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("midtrans notification", e.message);
    return fail(res, 500, "Notifikasi belum dapat diproses.");
  }
};
