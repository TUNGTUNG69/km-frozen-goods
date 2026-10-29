// Public site: swaps the built-in catalog for the live product list from Firebase.
// If the live list can't load, a notice explains why ordering is unavailable.
import { watchProducts, isOutOfStock } from "./products-service.js";
import { isConfigured } from "./firebase-init.js";
import { friendlyError } from "./auth-service.js";

function notice(text){
  const box = document.getElementById("orderNotice");
  if (!box) return;
  box.textContent = text || "";
  box.style.display = text ? "block" : "none";
}

if (!isConfigured) {
  notice("Ordering is unavailable: Firebase is not set up yet (see SETUP.md).");
} else {
  watchProducts((list) => {
    if (!list.length) {
      notice("Ordering is not ready yet: the admin must log in to the Admin Panel once to load the products into Firebase.");
      return;
    }
    notice("");
    window.setCatalog(list.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      priceLabel: p.priceLabel || "",
      description: p.size || "",
      image: p.image || "",
      quantity: p.quantity || 0,
      out: isOutOfStock(p),
      live: true
    })));
  }, (err) => {
    notice("Ordering is unavailable: " + friendlyError(err));
  });
}
