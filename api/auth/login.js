const bcrypt = require("bcryptjs");
const { query } = require("../../lib/db");
const { method, readBody, send, fail, createSession, setCookie } = require("../../lib/http");
module.exports = async (req, res) => {
  if (!method(req, res, "POST")) return;
  try {
    const { email, password } = await readBody(req);
    const result = await query(
      "SELECT id,name,email,password_hash FROM users WHERE email=$1",
      [String(email || "").trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(password || ""), user.password_hash))) {
      return fail(res, 401, "Email atau password salah.");
    }
    setCookie(res, await createSession(user));
    return send(res, 200, { user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error("login error", e.message);
    return fail(res, 500, "Login gagal. Periksa konfigurasi server.");
  }
};
