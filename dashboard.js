const SUPABASE_URL =
"https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

const welcomeText =
document.getElementById("welcomeText");

const userName =
document.getElementById("userName");

const userEmail =
document.getElementById("userEmail");

const avatar =
document.getElementById("avatar");

const logoutBtn =
document.getElementById("logoutBtn");

async function loadDashboard() {

try {

const {
  data,
  error
} = await supabaseClient.auth.getSession();


if (error) {

  console.error(
    "Session error:",
    error
  );

  window.location.href =
    "index.html";

  return;
}


const session =
  data.session;


if (!session) {

  window.location.href =
    "index.html";

  return;
}


const user =
  session.user;


const email =
  user.email || "User";


const name =
  user.user_metadata?.full_name ||
  user.user_metadata?.name ||
  email.split("@")[0];


welcomeText.textContent =
  "Signed in as " + email;


userName.textContent =
  name;


userEmail.textContent =
  email;


avatar.textContent =
  name
    .charAt(0)
    .toUpperCase();

} catch (error) {

console.error(
  "Dashboard error:",
  error
);

window.location.href =
  "index.html";

}

}

logoutBtn.addEventListener(
"click",
async function () {

logoutBtn.disabled = true;

logoutBtn.textContent =
  "LOGGING OUT...";


const {
  error
} =
  await supabaseClient.auth.signOut();


if (error) {

  console.error(
    "Logout error:",
    error
  );

  logoutBtn.disabled = false;

  logoutBtn.textContent =
    "LOGOUT";

  return;
}


sessionStorage.clear();


window.location.href =
  "index.html";

}
);

loadDashboard();
