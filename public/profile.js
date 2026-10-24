(async()=>{
 try{
  const r=await fetch("/api/auth/me");if(r.status===401){location.href="/login.html";return}
  const d=await r.json();if(!r.ok)throw new Error(d.error||"Gagal");
  document.querySelector("#profileName").textContent=d.user.name;
  document.querySelector("#profileEmail").textContent=d.user.email;
  document.querySelector("#avatar").textContent=(d.user.name||"S").trim().charAt(0).toUpperCase();
 }catch(e){Swal.fire({icon:"error",title:"Gagal memuat profile",text:e.message,background:"#151515",color:"#fff"})}
})();
document.querySelector("#logoutProfile").addEventListener("click",async()=>{const x=await Swal.fire({title:"Keluar dari akun?",text:"Kamu perlu login lagi untuk membuka dashboard.",showCancelButton:true,confirmButtonText:"Logout",cancelButtonText:"Batal",background:"#151515",color:"#fff"});if(x.isConfirmed){await fetch("/api/auth/me",{method:"DELETE"});location.href="/login.html"}});
