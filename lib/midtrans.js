const crypto = require("node:crypto");
function config() {
  const production = String(process.env.MIDTRANS_IS_PRODUCTION).toLowerCase() === "true";
  return {
    production,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
    snapUrl: production
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions",
    snapJs: production
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js"
  };
}
async function createSnap({ orderId, amount, email, name }) {
  const c = config();
  if (!c.serverKey) throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  const auth = Buffer.from(`${c.serverKey}:`).toString("base64");
  const response = await fetch(c.snapUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: { first_name: name || "Sora OTP User", email },
      item_details: [{ id: "wallet-topup", price: amount, quantity: 1, name: "Topup saldo Sora OTP" }],
      callbacks: { finish: `${process.env.APP_URL || ""}/dashboard.html?topup=finish` }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_messages?.join(", ") || "Gagal membuat pembayaran Midtrans.");
  return data;
}
function verifyNotification(body) {
  const c = config();
  if (!c.serverKey || !body?.signature_key) return false;
  const expected = crypto.createHash("sha512")
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${c.serverKey}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(body.signature_key));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
module.exports = { config, createSnap, verifyNotification };
