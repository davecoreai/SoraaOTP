const fmt=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(url,opt={}){const r=await fetch(url,opt);const d=await r.json();if(!r.ok)throw new Error(d.error||"Request gagal");return d}
const amount=document.querySelector("#amount"),preview=document.querySelector("#amountPreview");
function updateAmount(){preview.textContent=fmt(amount.value)}
amount.addEventListener("input",updateAmount);
document.querySelectorAll("[data-amount]").forEach(b=>b.addEventListener("click",()=>{amount.value=b.dataset.amount;updateAmount()}));
document.querySelector("#topupForm").addEventListener("submit",async e=>{
 e.preventDefault();const value=Number(amount.value);
 if(!Number.isSafeInteger(value)||value<10000||value>10000000)return Swal.fire({icon:"warning",title:"Nominal tidak valid",text:"Minimal Rp10.000 dan maksimal Rp10.000.000.",background:"#151515",color:"#fff"});
 const btn=document.querySelector("#payButton");btn.disabled=true;btn.textContent="Menyiapkan pembayaran...";
 try{
  const d=await api("/api/topup/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:value})});
  if(!d.redirect_url)throw new Error("URL pembayaran tidak diterima dari Midtrans.");
  await Swal.fire({icon:"success",title:"Pembayaran siap",text:"Kamu akan diarahkan ke halaman pembayaran Midtrans.",timer:1300,showConfirmButton:false,background:"#151515",color:"#fff"});
  location.href=d.redirect_url;
 }catch(err){Swal.fire({icon:"error",title:"Topup gagal dibuat",text:err.message,background:"#151515",color:"#fff"})}
 finally{btn.disabled=false;btn.innerHTML='Lanjutkan pembayaran <span>→</span>'}
});
async function loadHistory(){
 try{const d=await api("/api/auth/me");const el=document.querySelector("#topupHistory");if(!d.topups?.length){el.innerHTML='<div class="empty-state">Belum ada transaksi topup.</div>';return}
 el.innerHTML=d.topups.map(t=>`<div class="activity-row"><div class="activity-icon">＋</div><div class="activity-info"><b>Topup saldo</b><small>${new Date(t.created_at).toLocaleString("id-ID")}</small></div><div class="activity-price">${fmt(t.amount)}<small>${safe(t.status)}</small></div></div>`).join("");
 }catch(e){document.querySelector("#topupHistory").innerHTML='<div class="empty-state">Silakan login untuk melihat riwayat.</div>'}
}
loadHistory();
