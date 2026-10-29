import { auth, db, isConfigured } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function appError(code, message){
  const e = new Error(message);
  e.code = code;
  return e;
}
function ensureConfigured(){
  if (!isConfigured) {
    throw appError("app/not-configured", "Firebase is not set up yet. Open firebase-config.js and paste your project settings (see SETUP.md).");
  }
}

export function friendlyError(err){
  const map = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "Incorrect email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists. Try logging in instead.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/network-request-failed": "Network problem. Check your internet connection and try again.",
    "auth/user-disabled": "This account has been disabled.",
    "permission-denied": "Permission denied. Check your Firestore security rules (see SETUP.md).",
    "app/use-admin-login": "This is an admin account. Please use the Admin Login page.",
    "app/not-admin": "This account does not have admin access.",
    "app/not-configured": err && err.message
  };
  return map[err && err.code] || ("Something went wrong. " + (err && err.message ? err.message : "Please try again."));
}

export function watchAuth(callback){
  if (!isConfigured) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}

export async function currentUserOnce(){
  if (!isConfigured) return null;
  await auth.authStateReady();
  return auth.currentUser;
}

export async function getRole(uid){
  ensureConfigured();
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().role : null;
}

export async function signUpCustomer({ name, email, password }){
  ensureConfigured();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name, email, role: "customer", createdAt: serverTimestamp()
  });
  return cred.user;
}

export async function loginCustomer(email, password){
  ensureConfigured();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  let role = await getRole(cred.user.uid);
  if (role === "admin") {
    await signOut(auth);
    throw appError("app/use-admin-login", "Admin account");
  }
  if (role === null) {
    // Account exists in Auth but has no profile yet: create a customer profile.
    await setDoc(doc(db, "users", cred.user.uid), {
      name: cred.user.displayName || email.split("@")[0],
      email, role: "customer", createdAt: serverTimestamp()
    });
  }
  return cred.user;
}

export async function loginAdmin(email, password){
  ensureConfigured();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const role = await getRole(cred.user.uid);
  if (role !== "admin") {
    await signOut(auth);
    throw appError("app/not-admin", "Not an admin");
  }
  return cred.user;
}

export async function resetPassword(email){
  ensureConfigured();
  await sendPasswordResetEmail(auth, email);
}

export async function logout(){
  if (isConfigured) await signOut(auth);
}
