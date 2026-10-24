const showAuthMessage = (text) => {
  const el = document.querySelector('#message');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
};
let supabaseClient = null;
let supabaseConfig = null;
async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const response = await fetch('/api/config', { cache: 'no-store' });
  const config = await response.json();
  if (!response.ok || !config.supabaseUrl || !config.supabaseAnonKey) throw new Error('Supabase belum dikonfigurasi. Tambahkan SUPABASE_URL dan SUPABASE_ANON_KEY di Vercel.');
  if (!window.supabase?.createClient) throw new Error('Library Supabase gagal dimuat. Muat ulang halaman.');
  supabaseConfig = config;
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return supabaseClient;
}
async function createAppSession(accessToken) {
  const response = await fetch('/api/auth/supabase', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({access_token:accessToken}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Gagal membuat sesi aplikasi.');
  return data;
}
document.querySelector('#loginForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type=submit]'); button.disabled = true;
  try {
    const client = await getSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email:document.querySelector('#email').value.trim(), password:document.querySelector('#password').value });
    if (error) throw error;
    if (!data.session?.access_token) throw new Error('Sesi login tidak tersedia. Periksa pengaturan konfirmasi email di Supabase.');
    await createAppSession(data.session.access_token);
    location.href = '/app';
  } catch (error) { showAuthMessage(error.message || 'Login gagal.'); } finally { button.disabled = false; }
});
document.querySelector('#registerForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.querySelector('#password').value;
  if (password !== document.querySelector('#confirmPassword').value) return showAuthMessage('Konfirmasi password tidak cocok.');
  const button = event.currentTarget.querySelector('button[type=submit]'); button.disabled = true;
  try {
    const client = await getSupabase();
    const email = document.querySelector('#email').value.trim();
    const name = document.querySelector('#name').value.trim();
    const { data, error } = await client.auth.signUp({ email, password, options:{ data:{ full_name:name }, emailRedirectTo:`${supabaseConfig?.baseUrl || location.origin}/auth/login` } });
    if (error) throw error;
    if (data.session?.access_token) {
      await createAppSession(data.session.access_token);
      location.href = '/app';
    } else {
      showAuthMessage('Akun berhasil dibuat. Periksa email untuk verifikasi, lalu login kembali.');
    }
  } catch(error) { showAuthMessage(error.message || 'Registrasi gagal.'); } finally { button.disabled = false; }
});
document.querySelector('#googleButton')?.addEventListener('click', async () => {
  const button = document.querySelector('#googleButton'); button.disabled = true;
  try {
    const client = await getSupabase();
    const { error } = await client.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:`${supabaseConfig?.baseUrl || location.origin}/auth/callback`, queryParams:{ access_type:'offline', prompt:'select_account' } } });
    if (error) throw error;
  } catch (error) { showAuthMessage(error.message || 'Login Google gagal.'); button.disabled = false; }
});
