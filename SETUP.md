# KM's Frozen Goods: Firebase setup

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it (for example `kms-frozen-goods`). Google Analytics is optional.

## 2. Turn on Authentication and Firestore
1. **Build > Authentication > Get started > Sign-in method**: enable **Email/Password**.
2. **Build > Firestore Database > Create database**: pick a location close to the Philippines
   (for example `asia-southeast1`), start in **production mode**.

## 3. Connect the website
1. **Project settings (gear icon) > General > Your apps > Web (`</>`)**: register an app.
2. Copy the `firebaseConfig` values into `firebase-config.js`.

## 4. Paste these security rules
**Firestore Database > Rules**, replace everything with the rules below, then **Publish**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{uid} {
      allow read: if isSignedIn() && (request.auth.uid == uid || isAdmin());
      // Customers can only create their own profile, and only as a customer.
      allow create: if isSignedIn() && request.auth.uid == uid
                    && request.resource.data.role == 'customer';
      // Only an admin can change profiles (this blocks customers from making themselves admin).
      allow update: if isAdmin();
      allow delete: if false;
    }

    // Anyone can view the catalog; only the admin can change it.
    match /products/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Customers can place orders and read their own. The admin can read and update all orders.
    match /orders/{id} {
      allow create: if isSignedIn()
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.status == 'pending'
                    && request.resource.data.items is list
                    && request.resource.data.items.size() > 0
                    && request.resource.data.items.size() <= 50;
      allow read: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin());
      allow update: if isAdmin();
      allow delete: if false;
    }
  }
}
```

## 5. Create your admin account
Admins cannot sign up from the website on purpose. Create one manually:
1. **Authentication > Users > Add user**: enter the admin email and a strong password.
   Copy the **User UID** shown in the table.
2. **Firestore Database > Start collection** named `users`.
   Document ID = the **User UID** you copied. Add these fields (all type string):
   - `name` : `Admin`
   - `email` : the admin email
   - `role` : `admin`
3. Log in at `admin-login.html`.

## 6. Run the site
The pages use ES modules, so they must be served over http. Double-clicking the HTML file will not work.
- VS Code: install **Live Server**, right-click `index.html`, **Open with Live Server**.
- Or in the folder run: `python -m http.server 8000` and open http://localhost:8000
- `localhost` is already an authorized domain. When you deploy, add your domain under
  **Authentication > Settings > Authorized domains** (Firebase Hosting does this for you).

## 7. Deploy to Firebase Hosting
This is a static HTML/CSS/JavaScript site, so it has no npm build step and does not need a `package.json`.
From the workspace root (the folder containing `firebase.json`), run:

```
firebase deploy --only hosting
```

Firebase Hosting serves the files in `km-frozen-goods`, including its `index.html`.
Do not run `npm run build` for this site; it will fail because there is no npm project to build.

## Folder layout
Keep your picture folder next to these files, exactly as before:
```
index.html  login.html  admin-login.html  admin.html
my-orders.html
styles.css  catalog.js  landing.js  site-auth.js  login.js  admin-login.js  admin.js
auth-service.js  firebase-init.js  firebase-config.js
products-service.js  products-live.js  cart.js  my-orders.js
img/   <- your existing product pictures, file names unchanged
```
