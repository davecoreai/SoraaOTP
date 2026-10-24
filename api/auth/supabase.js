const { query } = require('../../lib/db');
const { method, readBody, send, fail, createSession, setCookie } = require('../../lib/http');
module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  try {
    const { access_token } = await readBody(req);
    if (typeof access_token !== 'string' || access_token.length < 20) return fail(res, 400, 'Token login tidak valid.');
    const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!base || !anon) return fail(res, 503, 'Supabase belum dikonfigurasi di environment Vercel.');
    const verify = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${access_token}` } });
    if (!verify.ok) return fail(res, 401, 'Sesi Supabase tidak valid. Coba login Google lagi.');
    const identity = await verify.json();
    const email = String(identity.email || '').trim().toLowerCase();
    if (!identity.id || !email || !identity.email_confirmed_at || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Email akun belum terverifikasi atau tidak valid. Verifikasi email di Supabase lalu coba lagi.');
    const meta = identity.user_metadata || {};
    const name = String(meta.full_name || meta.name || email.split('@')[0]).trim().slice(0, 80) || 'Pengguna';
    let result = await query('SELECT id,name,email FROM users WHERE email=$1 LIMIT 1', [email]);
    let user = result.rows[0];
    if (!user) {
      result = await query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,NULL) RETURNING id,name,email', [name,email]);
      user = result.rows[0];
    }
    await query('INSERT INTO wallets(user_id,balance) VALUES($1,0) ON CONFLICT (user_id) DO NOTHING', [user.id]);
    setCookie(res, await createSession(user));
    return send(res, 200, { ok: true, user: { id:user.id, name:user.name, email:user.email } });
  } catch (e) {
    console.error('supabase auth exchange error', e.message);
    return fail(res, 500, 'Gagal menghubungkan login Supabase. Periksa database dan konfigurasi.');
  }
};
