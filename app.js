// ==========================================
// GAAWOW EMS - Supabase Configuration
// ==========================================

const SUPABASE_URL =
"https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

// Create Supabase client
const supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

// ==========================================
// DOM ELEMENTS
// ==========================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

// ==========================================
// MESSAGE FUNCTION
// ==========================================

function showMessage(text, type = "info") {

message.textContent = text;

if (type === "success") {
message.style.color = "#16A34A";
}

else if (type === "error") {
message.style.color = "#DC2626";
}

else {
message.style.color = "#64748B";
}
}

// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener("submit", async function (event) {

event.preventDefault();

const email = emailInput.value.trim();
const password = passwordInput.value;

if (!email || !password) {
showMessage(
"Please enter your email and password.",
"error"
);
return;
}

loginButton.disabled = true;
loginButton.textContent = "LOGGING IN...";
showMessage("Checking your account...", "info");

try {

const { data, error } =  
  await supabaseClient.auth.signInWithPassword({  
    email: email,  
    password: password  
  });  


// --------------------------------------  
// Supabase login error  
// --------------------------------------  

if (error) {  

  console.error("Supabase Login Error:", error);  

  showMessage(  
    error.message || "Login failed.",  
    "error"  
  );  

  return;  
}  


// --------------------------------------  
// Login successful  
// --------------------------------------  

if (data && data.user) {  

  showMessage(  
    "Login successful! Welcome to GAAWOW EMS.",  
    "success"  
  );  

  console.log("Logged in user:", data.user);  

  // Save user ID for next pages  
  sessionStorage.setItem(  
    "gaawow_user_id",  
    data.user.id  
  );  

  sessionStorage.setItem(  
    "gaawow_user_email",  
    data.user.email || email  
  );  


  // ----------------------------------  
  // Redirect  
  // ----------------------------------  

  setTimeout(function () {  

    window.location.href = "dashboard.html";  

  }, 1000);  

}

}

catch (err) {

console.error("Unexpected Login Error:", err);  

showMessage(  
  "Something went wrong. Please try again.",  
  "error"  
);

}

finally {

loginButton.disabled = false;  
loginButton.textContent = "LOGIN";

}

});

// ==========================================
// CHECK EXISTING SESSION
// ==========================================

async function checkExistingSession() {

try {

const { data, error } =  
  await supabaseClient.auth.getSession();  

if (error) {  

  console.error(  
    "Session Error:",  
    error  
  );  

  return;  
}  


if (data && data.session) {  

  console.log(  
    "Existing session found:",  
    data.session.user.email  
  );  

  // Optional:  
  // If already logged in, go directly  
  // to dashboard.  

  // window.location.href = "dashboard.html";  
}

}

catch (error) {

console.error(  
  "Session Check Error:",  
  error  
);

}

}

// Run session check
checkExistingSession();
