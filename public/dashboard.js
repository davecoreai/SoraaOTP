const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
async function loadDashboard(){
  try{
    const res=await fetch("/api/auth/me");
    if(res.status===401){location.href="/login.html";return}
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Gagal memuat dashboard");
    document.querySelector("#userName").textContent=(data.user.name||"Pengguna").split(" ")[0];
    document.querySelector("#balance").textContent=rupiah(data.balance);
    document.querySelector("#todayDate").textContent=new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date());
    const list=document.querySelector("#recentOrders");
    if(!data.orders?.length){list.innerHTML='<div class="empty-state">Belum ada order. <a href="/order.html">Mulai order →</a></div>';return}
    list.innerHTML=data.orders.map(o=>`<div class="activity-row"><div class="activity-icon">${escapeHtml((o.service_name||"OTP").slice(0,2).toUpperCase())}</div><div class="activity-info"><b>${escapeHtml(o.service_name)}</b><small>${escapeHtml(o.country_name||"") } · ${escapeHtml(o.provider||"")}</small></div><div class="activity-price">${rupiah(o.quoted_price)}<small>${escapeHtml(o.status||"pending")}</small></div></div>`).join("");
  }catch(e){Swal.fire({icon:"error",title:"Gagal memuat dashboard",text:e.message,background:"#151515",color:"#fff"})}
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
document.querySelector("#logoutBtn")?.addEventListener("click",async()=>{await fetch("/api/auth/me",{method:"DELETE"});location.href="/login.html"});
loadDashboard();
