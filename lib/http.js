const { jwtVerify, SignJWT } = require("jose");
const COOKIE = "sora_session";

function send(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}
function method(req, res, expected) {
  if (req.method !== expected) {
    res.setHeader("Allow", expected);
    send(res, 405, { error: "Method not allowed" });
    return false;
  }
  return true;
}
function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Payload terlalu besar"));
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error("JSON tidak valid")); }
    });
    req.on("error", reject);
  });
}
function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET harus diisi dengan secret acak minimal 32 karakter.");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}
async function createSession(user) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}
function setCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`);
}
function clearCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}
async function auth(req) {
  const raw = req.headers.cookie || "";
  const tokenPart = raw.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="));
  if (!tokenPart) return null;
  try {
    const token = decodeURIComponent(tokenPart.slice(COOKIE.length + 1));
    const { payload } = await jwtVerify(token, secret());
    return { id: payload.sub, email: payload.email, name: payload.name };
  } catch { return null; }
}
function fail(res, status, message) {
  return send(res, status, { error: message });
}
module.exports = { send, method, readBody, createSession, setCookie, clearCookie, auth, fail };
