const bcrypt = require("bcryptjs");
const { query } = require("../../lib/db");
const { method, readBody, send, fail, createSession, setCookie } = require("../../lib/http");
module.exports = async (req, res) => {
  if (!method(req, res, "POST")) return;
  try {
    const { name, email, password } = await readBody(req);
    const cleanName = String(name || "").trim().slice(0, 80);
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (cleanName.length < 2) return fail(res, 400, "Nama minimal 2 karakter.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return fail(res, 400, "Email tidak valid.");
    if (typeof password !== "string" || password.length < 8 || password.length > 128) return fail(res, 400, "Password harus 8–128 karakter.");
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email",
      [cleanName, cleanEmail, hash]
    );
    const user = result.rows[0];
    await query("INSERT INTO wallets(user_id,balance) VALUES($1,0)", [user.id]);
    setCookie(res, await createSession(user));
    return send(res, 201, { user });
  } catch (e) {
    if (e.code === "23505") return fail(res, 409, "Email sudah terdaftar.");
    console.error("register error", e.message);
    return fail(res, 500, "Gagal membuat akun. Periksa konfigurasi database.");
  }
};
