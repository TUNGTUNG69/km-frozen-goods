import { isConfigured } from "./firebase-init.js";
import {
  signUpCustomer, loginCustomer, resetPassword, friendlyError, currentUserOnce, getRole
} from "./auth-service.js";

const $ = (id) => document.getElementById(id);
const msg = $("authMsg");

function show(text, type){
  msg.className = "alert " + (type === "ok" ? "alert-success" : "alert-danger");
  msg.textContent = text;
  msg.style.display = "block";
}
function clearMsg(){ msg.style.display = "none"; }

function setMode(mode){
  const signup = mode === "signup";
  $("loginForm").style.display = signup ? "none" : "block";
  $("signupForm").style.display = signup ? "block" : "none";
  $("tabLogin").classList.toggle("active", !signup);
  $("tabSignup").classList.toggle("active", signup);
  $("tabLogin").setAttribute("aria-selected", String(!signup));
  $("tabSignup").setAttribute("aria-selected", String(signup));
  clearMsg();
}
$("tabLogin").addEventListener("click", () => setMode("login"));
$("tabSignup").addEventListener("click", () => setMode("signup"));
document.querySelectorAll("[data-go]").forEach(b =>
  b.addEventListener("click", () => setMode(b.getAttribute("data-go"))));
document.querySelectorAll("[data-toggle-pw]").forEach(box =>
  box.addEventListener("change", () => {
    box.getAttribute("data-toggle-pw").split(",").forEach(id => {
      $(id).type = box.checked ? "text" : "password";
    });
  }));

setMode(new URLSearchParams(location.search).get("mode") === "signup" ? "signup" : "login");

if (!isConfigured) {
  const w = $("configWarning");
  w.textContent = "Firebase is not set up yet. Open firebase-config.js and paste your project settings (see SETUP.md).";
  w.style.display = "block";
}

function busy(btn, on, label){
  btn.disabled = on;
  btn.textContent = on ? "Please wait..." : label;
}
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  if (!emailOk(email) || !password) { show("Please enter your email and password.", "err"); return; }
  busy($("loginBtn"), true, "Log In");
  try {
    await loginCustomer(email, password);
    location.href = "index.html";
  } catch (err) {
    show(friendlyError(err), "err");
    busy($("loginBtn"), false, "Log In");
  }
});

$("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();
  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const pw = $("signupPassword").value;
  const confirm = $("signupConfirm").value;
  if (!name) { show("Please enter your full name.", "err"); return; }
  if (!emailOk(email)) { show("Please enter a valid email address.", "err"); return; }
  if (pw.length < 6) { show("Password must be at least 6 characters.", "err"); return; }
  if (pw !== confirm) { show("Passwords do not match.", "err"); return; }
  busy($("signupBtn"), true, "Create Account");
  try {
    await signUpCustomer({ name, email, password: pw });
    location.href = "index.html";
  } catch (err) {
    show(friendlyError(err), "err");
    busy($("signupBtn"), false, "Create Account");
  }
});

$("forgotBtn").addEventListener("click", async () => {
  clearMsg();
  const email = $("loginEmail").value.trim();
  if (!emailOk(email)) { show("Enter your email above first, then click Forgot password.", "err"); return; }
  try {
    await resetPassword(email);
    show("If an account exists for that email, a reset link has been sent.", "ok");
  } catch (err) {
    show(friendlyError(err), "err");
  }
});

// Already signed in? Skip the form.
(async () => {
  try {
    const user = await currentUserOnce();
    if (!user) return;
    const role = await getRole(user.uid);
    location.replace(role === "admin" ? "admin.html" : "index.html");
  } catch (e) { /* stay on page */ }
})();
