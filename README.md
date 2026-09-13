# URPPTmaker — Vercel + Firebase Spark fixed version

This build is designed for Vercel static deployment and Firebase Spark. It does NOT use Firebase Storage.

## Important
The QR is a static website asset at:
assets/payment-qr.png

Firebase project:
pptmaker-153e5

Admin email:
koushiksharan.08@gmail.com

Prices:
5 = ₹10
8 = ₹15
10 = ₹20
15 = ₹30

## Firebase
Enable:
- Authentication > Google
- Authentication > Email/Password
- Firestore Database

Publish firestore.rules.

Do NOT enable Storage for this version.

## Vercel
Upload this project as the root of the Vercel project. `index.html` is at the root.

After deployment, copy the exact Vercel hostname and add it under:
Firebase Console > Authentication > Settings > Authorized domains

Example:
pptmaker-eight.vercel.app

Do not add https://, only the hostname.

## If Create PPT shows "internal"
That usually means the browser is running an older deployment or Firebase returned a generic error. This build replaces the generic error with the actual Firebase reason in the page.

After uploading this build to Vercel, hard refresh the site (Ctrl+Shift+R).
