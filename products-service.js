import { db, isConfigured } from "./firebase-init.js";
import {
  collection, doc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, limit, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const ORDER_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

function cleanImage(v){
  v = (v || "").trim();
  if (!v) return "";
  if (/^(https?:)?\/\//.test(v) || v.startsWith("img/")) return v;
  return "img/" + v;
}

export function isOutOfStock(p){
  return p.status === "out_of_stock" || !(Number(p.quantity) > 0);
}

export function watchProducts(onData, onError){
  if (!isConfigured) { onData([]); return () => {}; }
  return onSnapshot(collection(db, "products"), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name)));
    onData(list);
  }, (err) => { if (onError) onError(err); });
}

export async function seedIfEmpty(seedList){
  const snap = await getDocs(query(collection(db, "products"), limit(1)));
  if (!snap.empty) return 0;
  const batch = writeBatch(db);
  seedList.forEach((p, i) => {
    batch.set(doc(db, "products", "seed-" + (i + 1)), {
      name: p.name,
      category: p.category,
      size: p.description || "",
      price: Number(p.price),
      priceLabel: p.priceLabel || "",
      image: p.image || "",
      quantity: 20,
      status: "available",
      sortOrder: i + 1,
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
  return seedList.length;
}

export async function saveProduct(id, data){
  const payload = {
    name: data.name.trim(),
    category: data.category.trim().toUpperCase(),
    size: (data.size || "").trim(),
    price: Number(data.price),
    image: cleanImage(data.image),
    quantity: Math.max(0, Math.floor(Number(data.quantity) || 0))
  };
  payload.status = payload.quantity > 0 ? "available" : "out_of_stock";
  if (id) {
    await updateDoc(doc(db, "products", id), payload);
    return id;
  }
  payload.priceLabel = "";
  payload.sortOrder = Date.now();
  payload.createdAt = serverTimestamp();
  const ref = await addDoc(collection(db, "products"), payload);
  return ref.id;
}

export async function setStock(id, qty){
  qty = Math.max(0, Math.floor(Number(qty) || 0));
  await updateDoc(doc(db, "products", id), { quantity: qty, status: qty > 0 ? "available" : "out_of_stock" });
}
export async function setProductStatus(id, status){
  await updateDoc(doc(db, "products", id), { status });
}
export async function deleteProduct(id){
  await deleteDoc(doc(db, "products", id));
}

export async function placeOrder(order){
  const ref = await addDoc(collection(db, "orders"), {
    uid: order.uid,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    phone: order.phone,
    address: order.address,
    notes: order.notes || "",
    items: order.items,
    total: order.total,
    status: "pending",
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export function watchAllOrders(onData, onError){
  return onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err) => { if (onError) onError(err); });
}

export function watchMyOrders(uid, onData, onError){
  return onSnapshot(query(collection(db, "orders"), where("uid", "==", uid)),
    (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      onData(list);
    },
    (err) => { if (onError) onError(err); });
}

export async function setOrderStatus(id, status){
  await updateDoc(doc(db, "orders", id), { status });
}

export function peso(n){
  return "₱" + Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 });
}
