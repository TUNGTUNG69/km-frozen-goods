// Landing page header: swaps Log In / Sign Up for the user's name and Log Out when signed in.
import { watchAuth, getRole, logout } from "./auth-service.js";

const area = document.getElementById("authArea");
const defaultHtml = area.innerHTML;

watchAuth(async (user) => {
  if (!user) { area.innerHTML = defaultHtml; return; }

  let role = null;
  try { role = await getRole(user.uid); } catch (e) { /* show customer view */ }

  const name = user.displayName || (user.email || "").split("@")[0];
  area.replaceChildren();

  const who = document.createElement("span");
  who.className = "who";
  who.textContent = "Hi, " + name;
  area.appendChild(who);

  const mine = document.createElement("a");
  mine.href = "my-orders.html";
  mine.className = "nav-login";
  mine.textContent = "My Orders";
  area.appendChild(mine);

  if (role === "admin") {
    const a = document.createElement("a");
    a.href = "admin.html";
    a.className = "nav-login";
    a.textContent = "Admin Panel";
    area.appendChild(a);
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-logout";
  btn.textContent = "Log Out";
  btn.addEventListener("click", async () => { await logout(); });
  area.appendChild(btn);
});
