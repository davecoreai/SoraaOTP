(() => {
 const nav=document.querySelector("#bottomNav"),lens=document.querySelector("#navLens");
 if(!nav||!lens)return;
 const items=[...nav.querySelectorAll(".nav-item")];
 const active=items.findIndex(a=>a.classList.contains("active"));
 function move(index,animate=true){
   if(index<0)return;
   const item=items[index],navRect=nav.getBoundingClientRect(),rect=item.getBoundingClientRect();
   lens.style.transition=animate?"transform .35s cubic-bezier(.2,.8,.2,1),width .25s":"none";
   lens.style.width=`${rect.width}px`;
   lens.style.transform=`translateX(${rect.left-navRect.left-5}px)`;
   items.forEach((el,i)=>{el.classList.toggle("active",i===index);const icon=el.querySelector(".nav-icon");if(icon)icon.style.transform=i===index?"scale(1.2)":"scale(1)"});
 }
 requestAnimationFrame(()=>move(active,false));
 window.addEventListener("resize",()=>move(items.findIndex(a=>a.classList.contains("active")),false));
 // Dragging the glass lens changes the highlight; navigation happens when a user releases on a destination.
 let dragging=false,startX=0,initialX=0;
 lens.addEventListener("pointerdown",e=>{dragging=true;startX=e.clientX;const m=/translateX\(([-\d.]+)px\)/.exec(lens.style.transform);initialX=m?Number(m[1]):0;lens.setPointerCapture(e.pointerId);lens.style.transition="none";e.preventDefault()});
 lens.addEventListener("pointermove",e=>{if(!dragging)return;const max=nav.clientWidth-lens.offsetWidth-10;const x=Math.max(0,Math.min(max,initialX+e.clientX-startX));lens.style.transform=`translateX(${x}px)`});
 lens.addEventListener("pointerup",e=>{if(!dragging)return;dragging=false;const center=lens.getBoundingClientRect().left+lens.getBoundingClientRect().width/2;let closest=0,dist=Infinity;items.forEach((it,i)=>{const r=it.getBoundingClientRect(),d=Math.abs(center-(r.left+r.width/2));if(d<dist){dist=d;closest=i}});move(closest);if(items[closest])location.href=items[closest].href});
 lens.addEventListener("pointercancel",()=>{dragging=false;move(items.findIndex(a=>a.classList.contains("active")))});
 items.forEach((item,i)=>item.addEventListener("mouseenter",()=>{if(!dragging)move(i)}));
})();
