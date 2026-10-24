const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const escapeHTML=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let services=[],countries=[],offers=[];
async function api(url,options={}){const r=await fetch(url,options);const d=await r.json();if(!r.ok)throw new Error(d.error||"Permintaan gagal");return d}
async function init(){
 try{
  const me=await api("/api/auth/me");
  const response=await api("/api/catalog/services");
  services=response.data||[];
  $("#service").innerHTML='<option value="">Pilih layanan</option>'+services.map(s=>`<option value="${escapeHTML(s.id||s.slug)}" data-name="${escapeHTML(s.name)}">${escapeHTML(s.name)}${s.stock!=null?` · stok ${s.stock}`:""}</option>`).join("");
  $("#service").addEventListener("change",loadCountries);
  $("#provider").addEventListener("change",loadCountries);
  $("#country").addEventListener("change",loadOffers);
  $("#offer").addEventListener("change",updatePrice);
  await loadCountries();
  await loadOrders();
 }catch(e){Swal.fire({icon:"error",title:"Tidak dapat memuat katalog",text:e.message,background:"#151515",color:"#fff"});if(e.message.includes("login"))location.href="/login.html"}
}
async function loadCountries(){
 const service=$("#service").value;
 const provider=$("#provider").value;
 $("#country").innerHTML='<option value="">Memuat negara...</option>';$("#offer").innerHTML='<option value="">Memuat penawaran...</option>';
 if(!service){$("#country").innerHTML='<option value="indonesia">Indonesia (default)</option>';$("#offer").innerHTML='<option value="">Pilih layanan terlebih dahulu</option>';return}
 try{
  const d=await api(`/api/catalog/countries?service=${encodeURIComponent(service)}&provider=${provider}`);
  countries=d.data||[];
  const sorted=[...countries].sort((a,b)=>a.name.localeCompare(b.name));
  const indonesia=sorted.find(c=>String(c.name).toLowerCase()==="indonesia"||String(c.country_code).toLowerCase()==="indonesia");
  const ordered=indonesia?[indonesia,...sorted.filter(c=>c!==indonesia)]:sorted;
  $("#country").innerHTML=ordered.length?ordered.map(c=>`<option value="${escapeHTML(c.country_code)}" data-name="${escapeHTML(c.name)}">${escapeHTML(c.name)}${c.price!=null?" · mulai "+money(c.price):""}</option>`).join(""):'<option value="">Negara tidak tersedia</option>';
  await loadOffers();
 }catch(e){$("#country").innerHTML='<option value="">Gagal memuat negara</option>';$("#offer").innerHTML='<option value="">Tidak tersedia</option>';throw e}
}
async function loadOffers(){
 const service=$("#service").value,provider=$("#provider").value,country=$("#country").value;
 if(!service||!country)return;
 $("#offer").innerHTML='<option value="">Memuat server...</option>';
 const d=await api(`/api/catalog/offers?service=${encodeURIComponent(service)}&provider=${provider}&country=${encodeURIComponent(country)}`);
 offers=d.data||[];
 $("#offer").innerHTML=offers.length?offers.map((o,i)=>`<option value="${i}" data-price="${Number(o.price)}">${escapeHTML(o.server_label||o.provider_id||"Penawaran "+(i+1))} · ${money(o.price)}${o.stock!=null?" · stok "+o.stock:""}</option>`).join(""):'<option value="">Tidak ada penawaran tersedia</option>';
 updatePrice();
}
function selectedOffer(){const i=Number($("#offer").value);return Number.isInteger(i)?offers[i]:null}
function updatePrice(){const o=selectedOffer();$("#price").textContent=o?money(o.price):"—"}
$("#orderForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const s=services.find(x=>String(x.id||x.slug)===$("#service").value),c=countries.find(x=>String(x.country_code)===$("#country").value),o=selectedOffer();
 if(!s||!c||!o)return Swal.fire({icon:"info",title:"Pilih layanan lengkap",text:"Pilih layanan, negara, dan penawaran yang tersedia.",background:"#151515",color:"#fff"});
 const ok=await Swal.fire({title:"Konfirmasi order",html:`<div style="text-align:left;font-size:13px;line-height:2">Layanan: <b>${escapeHTML(s.name)}</b><br>Provider: <b>${escapeHTML($("#provider").selectedOptions[0].text)}</b><br>Negara: <b>${escapeHTML(c.name)}</b><br>Harga: <b>${money(o.price)}</b></div>`,showCancelButton:true,confirmButtonText:"Beli nomor",cancelButtonText:"Batal",background:"#151515",color:"#fff",confirmButtonColor:"#f5f5f5",customClass:{confirmButton:"swal-confirm"}});
 if(!ok.isConfirmed)return;
 const btn=$("#buyButton");btn.disabled=true;btn.textContent="Memproses...";
 try{
  const d=await api("/api/orders/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:s.id||s.slug,service_name:s.name,provider:$("#provider").value,country_code:c.country_code,country_name:c.name,provider_id:o.provider_id,quoted_price:Number(o.price)})});
  await Swal.fire({icon:"success",title:"Order dibuat",html:`<p>Nomor: <b>${escapeHTML(d.order.number||"Sedang disiapkan")}</b></p><p>Status: ${escapeHTML(d.order.status||"pending")}</p>`,background:"#151515",color:"#fff"});
  await loadOrders();
 }catch(err){
  if(err.message.toLowerCase().includes("saldo tidak cukup")) await Swal.fire({icon:"warning",title:"Saldo Tidak Cukup",text:"Saldo kamu tidak cukup untuk membeli nomor ini. Topup minimal Rp10.000 terlebih dahulu.",showCancelButton:true,confirmButtonText:"Topup sekarang",cancelButtonText:"Nanti",background:"#151515",color:"#fff"}).then(r=>{if(r.isConfirmed)location.href="/topup.html"});
  else await Swal.fire({icon:"error",title:"Order gagal",text:err.message,background:"#151515",color:"#fff"});
 }finally{btn.disabled=false;btn.innerHTML='Pembayaran / Beli nomor <span>→</span>'}
});
async function loadOrders(){
 try{const d=await api("/api/auth/me");const list=$("#ordersList");if(!d.orders?.length){list.innerHTML='<div class="empty-state">Belum ada order.</div>';return}
 list.innerHTML=d.orders.map(o=>`<div class="activity-row"><div class="activity-icon">${escapeHTML((o.service_name||"OTP").slice(0,2).toUpperCase())}</div><div class="activity-info"><b>${escapeHTML(o.service_name)}</b><small>${escapeHTML(o.country_name)} · ${escapeHTML(o.provider)}</small>${o.otp_code?`<small class="otp-code">OTP: ${escapeHTML(o.otp_code)}</small>`:""}</div><div class="activity-price">${money(o.quoted_price)}<small>${escapeHTML(o.status)}</small></div></div>`).join("")}
 catch(e){$("#ordersList").innerHTML='<div class="empty-state">Gagal memuat riwayat order.</div>'}
}
$("#refreshOrders").addEventListener("click",loadOrders);
init();
