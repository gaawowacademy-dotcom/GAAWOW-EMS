const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const $ = (id) => document.getElementById(id);
const loginForm = $("loginForm"), emailInput = $("email"), passwordInput = $("password"), loginButton = $("loginButton"), message = $("message");
function showMessage(text, type="info") { message.textContent=text; message.style.color=type==="success"?"#16A34A":type==="error"?"#DC2626":"#64748B"; }
async function redirectAfterLogin(user) {
  const { data: student, error } = await supabaseClient.from("students").select("id,student_id,full_name,auth_user_id,account_enabled").eq("auth_user_id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (student) {
    if (student.account_enabled === false) throw new Error("Your student account is currently disabled. Please contact GAAWOW Academy.");
    sessionStorage.setItem("gaawow_student_id", student.id);
    sessionStorage.setItem("gaawow_student_number", student.student_id || "");
    sessionStorage.setItem("gaawow_student_name", student.full_name || "");
    window.location.replace("student-portal.html?v=8");
    return;
  }
  window.location.replace("dashboard.html");
}
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email=emailInput.value.trim(), password=passwordInput.value;
  if (!email || !password) return showMessage("Please enter your email and password.","error");
  loginButton.disabled=true; loginButton.textContent="LOGGING IN..."; showMessage("Checking your account...");
  try {
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error) throw error;
    if(!data?.user) throw new Error("Login succeeded but no user session was returned.");
    sessionStorage.setItem("gaawow_user_id",data.user.id);
    sessionStorage.setItem("gaawow_user_email",data.user.email||email);
    showMessage("Login successful! Opening your portal...","success");
    await redirectAfterLogin(data.user);
  } catch(err) { console.error(err); showMessage(err?.message||"Something went wrong. Please try again.","error"); }
  finally { loginButton.disabled=false; loginButton.textContent="LOGIN"; }
});
