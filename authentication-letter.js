const A={
 U:"https://mytyvqwrxnxpxnxpiicj.supabase.co",
 K:"sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145",
 L:"https://i.ibb.co/4ZCRpm30/gaawow-logo.png"
};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function load(){
 const r=await fetch(`${A.U}/rest/v1/students?select=*&order=full_name.asc`,{headers:{apikey:A.K,Authorization:"Bearer "+A.K}});
 const a=await r.json();$("student").innerHTML='<option value="">— Select Student —</option>';
 a.forEach(x=>{let o=document.createElement("option");o.value=x.student_id||"";o.textContent=`${x.full_name} — ${x.student_id||""}`;o.dataset.x=JSON.stringify(x);$("student").appendChild(o)});
}
$("student").onchange=()=>{let o=$("student").selectedOptions[0];if(!o.dataset.x)return;let x=JSON.parse(o.dataset.x);$("name").value=x.full_name||"";$("sid").value=x.student_id||""};
function generate(){if(!$("name").value)return alert("Select a registered student first.");$("ref").value="GA-AUTH-"+new Date().getFullYear()+"-"+Math.floor(100000+Math.random()*900000);render()}
function render(){
 const today=new Date().toLocaleDateString("en-GB");
 $("sheet").innerHTML=`<div class="letter"><img src="${A.L}" class="logo"><div class="academy">GAAWOW ACADEMY</div><div class="motto">Ilayska Aqoonta iyo Xirfadda</div><div class="line"></div><div class="heading">AUTHENTICATION LETTER</div><div class="ref">Reference: <b>${esc($("ref").value)}</b> &nbsp;&nbsp; Date: ${today}</div><p>To Whom It May Concern,</p><p>This letter is issued by <b>GAAWOW Academy</b> to officially authenticate the academic record of:</p><div class="student">${esc($("name").value)}</div><p><b>Student ID:</b> ${esc($("sid").value)}</p><p><b>Course / Programme:</b> ${esc($("course").value)}</p><p>This document confirms that the above-named student is registered with GAAWOW Academy and that the information stated above is issued for official authentication purposes.</p><p>For further verification, please contact GAAWOW Academy using the official contact information below.</p><div class="sign"><div><hr><b>${esc($("director").value||"ACADEMY DIRECTOR")}</b><small>Academy Director</small></div><div><hr><b>${esc($("signatory").value||"AUTHORIZED SIGNATORY")}</b><small>Authorized Signature</small></div></div><div class="footer">GAAWOW Academy • Bur Hakaba Bay, Somalia • 615228824 / 625228824</div></div>`;
}
async function download(){let c=await html2canvas($("sheet"),{scale:3,useCORS:true});let a=document.createElement("a");a.download=($("ref").value||"GAAWOW-Authentication-Letter")+".png";a.href=c.toDataURL("image/png");a.click()}
document.addEventListener("DOMContentLoaded",()=>{load();$("gen").onclick=generate;$("prev").onclick=render;$("down").onclick=download;$("print").onclick=()=>print()});
