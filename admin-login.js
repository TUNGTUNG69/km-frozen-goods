import { isConfigured } from "./firebase-init.js";
import { loginAdmin, friendlyError, currentUserOnce, getRole, logout } from "./auth-service.js";

const $ = (id) => document.getElementById(id);
const msg = $("authMsg");
function show(text){
  msg.className = "alert alert-danger";
  msg.textContent = text;
  msg.style.display = "block";
}

if (!isConfigured) {
  const w = $("configWarning");
  w.textContent = "Firebase is not set up yet. Open firebase-config.js and paste your project settings (see SETUP.md).";
  w.style.display = "block";
}
if (new URLSearchParams(location.search).get("error") === "notadmin") {
  show("That account does not have admin access.");
}

$("showPw").addEventListener("change", (e) => {
  $("adminPassword").type = e.target.checked ? "text" : "password";
});

$("adminForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.style.display = "none";
  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;
  if (!email || !password) { show("Please enter your admin email and password."); return; }
  const btn = $("adminBtn");
  btn.disabled = true; btn.textContent = "Please wait...";
  try {
    await loginAdmin(email, password);
    location.href = "admin.html";
  } catch (err) {
    show(friendlyError(err));
    btn.disabled = false; btn.textContent = "Log In to Admin Panel";
  }
});

// Already signed in as admin? Go straight to the panel. Signed in as a customer? Leave them alone.
(async () => {
  try {
    const user = await currentUserOnce();
    if (!user) return;
    if ((await getRole(user.uid)) === "admin") location.replace("admin.html");
  } catch (e) { /* stay on page */ }
})();
