const crypto = require("node:crypto");
const { query, transaction } = require("../../lib/db");
const { nokos } = require("../../lib/nokos");
const { auth, method, readBody, send, fail } = require("../../lib/http");
module.exports = async (req, res) => {
  if (!method(req, res, "POST")) return;
  const user = await auth(req);
  if (!user) return fail(res, 401, "Silakan login terlebih dahulu.");
  let pendingOrderId = null;
  let debited = false;
  try {
    const body = await readBody(req);
    const serviceId = String(body.service_id || "").trim();
    const serviceName = String(body.service_name || "").trim().slice(0,120);
    const provider = String(body.provider || "provider_1");
    const countryCode = String(body.country_code || "indonesia");
    const countryName = String(body.country_name || "Indonesia").slice(0,100);
    const providerId = body.provider_id ? String(body.provider_id) : null;
    const price = Number(body.quoted_price);
    if (!serviceId || !serviceName) return fail(res, 400, "Layanan tidak valid.");
    if (!["provider_1","provider_2","provider_3"].includes(provider)) return fail(res, 400, "Provider tidak valid.");
    if (!Number.isSafeInteger(price) || price < 1) return fail(res, 400, "Harga penawaran tidak valid.");
    const markup = Math.max(0, Number(process.env.PRICE_MARKUP_IDR || 0));
    const finalPrice = price + Math.round(markup);
    const localId = crypto.randomUUID();
    await transaction(async client => {
      const wallet = await client.query("SELECT balance FROM wallets WHERE user_id=$1 FOR UPDATE", [user.id]);
      if (!wallet.rows[0]) throw new Error("WALLET_NOT_FOUND");
      if (Number(wallet.rows[0].balance) < finalPrice) throw new Error("INSUFFICIENT_BALANCE");
      await client.query("UPDATE wallets SET balance=balance-$1,updated_at=NOW() WHERE user_id=$2", [finalPrice,user.id]);
      await client.query(
        "INSERT INTO orders(id,user_id,service_id,service_name,provider,country_code,country_name,provider_id,quoted_price,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'processing')",
        [localId,user.id,serviceId,serviceName,provider,countryCode,countryName,providerId,finalPrice]
      );
      await client.query(
        "INSERT INTO wallet_ledger(user_id,amount,kind,reference,description) VALUES($1,$2,'purchase',$3,$4)",
        [user.id,-finalPrice,`purchase:${localId}`,`Pembelian ${serviceName}`]
      );
    });
    pendingOrderId = localId;
    debited = true;

    const upstream = await nokos("/api/v1/orders", {
      method: "POST",
      headers: { "Idempotency-Key": `sora-${localId}` },
      body: JSON.stringify({
        service_id: serviceId,
        provider,
        country_code: countryCode,
        ...(providerId ? { provider_id: providerId } : {}),
        quoted_price: price
      })
    });
    const upstreamId = upstream.id;
    await query(
      "UPDATE orders SET nokos_order_id=$1,number=$2,status=$3,upstream_payload=$4,updated_at=NOW() WHERE id=$5",
      [upstreamId || null,upstream.number || null,upstream.status || "pending",JSON.stringify(upstream),localId]
    );
    return send(res, 201, { order: { id: localId, ...upstream, service_name: serviceName, provider, country_name: countryName, quoted_price: finalPrice } });
  } catch (e) {
    if (debited && pendingOrderId) {
      try {
        await transaction(async client => {
          const row = await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [pendingOrderId]);
          if (row.rows[0] && !row.rows[0].nokos_order_id) {
            await client.query("UPDATE wallets SET balance=balance+$1,updated_at=NOW() WHERE user_id=$2", [row.rows[0].quoted_price,user.id]);
            await client.query(
              "INSERT INTO wallet_ledger(user_id,amount,kind,reference,description) VALUES($1,$2,'refund',$3,$4) ON CONFLICT(reference) DO NOTHING",
              [user.id,row.rows[0].quoted_price,`refund:${pendingOrderId}`,`Refund order gagal ${pendingOrderId}`]
            );
            await client.query("UPDATE orders SET status='failed',updated_at=NOW() WHERE id=$1", [pendingOrderId]);
          }
        });
      } catch (refundError) { console.error("refund error", refundError.message); }
    }
    if (e.message === "INSUFFICIENT_BALANCE") return fail(res, 402, "Saldo Tidak Cukup");
    if (e.message === "WALLET_NOT_FOUND") return fail(res, 404, "Wallet tidak ditemukan.");
    console.error("order create", e.message);
    return fail(res, e.status || 502, e.message || "Pembelian gagal.");
  }
};
