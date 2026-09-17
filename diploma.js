const D={
 U:"https://mytyvqwrxnxpxnxpiicj.supabase.co",
 K:"sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145",
 L:"https://i.ibb.co/4ZCRpm30/gaawow-logo.png"
};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function load(){
 const r=await fetch(`${D.U}/rest/v1/students?select=*&order=full_name.asc`,{headers:{apikey:D.K,Authorization:"Bearer "+D.K}});
 const a=await r.json();$("student").innerHTML='<option value="">— Select Student —</option>';
 a.forEach(x=>{let o=document.createElement("option");o.value=x.student_id||"";o.textContent=`${x.full_name} — ${x.student_id||""}`;o.dataset.x=JSON.stringify(x);$("student").appendChild(o)});
}
$("student").onchange=()=>{
 let o=$("student").selectedOptions[0];if(!o.dataset.x)return;
 let x=JSON.parse(o.dataset.x);$("name").value=x.full_name||"";$("sid").value=x.student_id||"";$("photo").value=x.photo_url||"";
};
function generate(){
 if(!$("name").value||!$("course").value)return alert("Select student and enter course.");
 $("no").value="GA-DIP-"+new Date().getFullYear()+"-"+Math.floor(100000+Math.random()*900000);
 render();
}
function render(){
 $("sheet").innerHTML=`<div class="diploma"><div class="water">G</div>
 <img class="logo" src="${D.L}">
 <div class="academy">GAAWOW ACADEMY</div><div class="motto">Ilayska Aqoonta iyo Xirfadda</div>
 <div class="heading">DIPLOMA</div><div class="sub">OF PROFESSIONAL COMPLETION</div>
 <div class="present">This Diploma is proudly awarded to</div>
 <div class="name">${esc($("name").value)}</div>
 <div class="body">for successful completion of the academic and practical requirements of</div>
 <div class="course">${esc($("course").value)}</div>
 <div class="details">Student ID: <b>${esc($("sid").value)}</b> &nbsp; • &nbsp; Diploma No: <b>${esc($("no").value)}</b></div>
 <div class="sign"><div><hr><b>${esc($("director").value||"ACADEMY DIRECTOR")}</b><small>Academy Director</small></div><div class="seal">GAAWOW<br>ACADEMY</div><div><hr><b>${esc($("signatory").value||"AUTHORIZED SIGNATORY")}</b><small>Authorized Signature</small></div></div>
 <div class="foot">Bur Hakaba Bay, Somalia • 615228824 / 625228824</div></div>`;
}
async function download(){
 const c=await html2canvas($("sheet"),{scale:3,useCORS:true});let a=document.createElement("a");a.download=($("no").value||"GAAWOW-Diploma")+".png";a.href=c.toDataURL("image/png");a.click();
}
document.addEventListener("DOMContentLoaded",()=>{load();$("gen").onclick=generate;$("prev").onclick=render;$("down").onclick=download;$("print").onclick=()=>print();});
