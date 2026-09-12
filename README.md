# URPPTmaker — deployment version

## Stack
Firebase Authentication + Firestore + Firebase Cloud Functions + Firebase Hosting + Razorpay.

## 1. Firebase
- Create/open Firebase project.
- Enable Authentication > Google and Email/Password.
- Create Firestore Database.
- Register a Web App and paste its config into `public/js/firebase-config.js`.
- Add your deployed domain under Authentication > Settings > Authorized domains.
- Create the administrator in Authentication:
  `koushiksharan.08@gmail.com`
  Use the password you chose in Firebase. Do not put that password in source code.
- Deploy Firestore rules and functions.

## 2. Razorpay
Create/test the Razorpay account and generate API keys. Keep the Key Secret only in Firebase Functions secrets.
Set:
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET

Configure Razorpay webhook URL to:
https://asia-south1-urpptmaker.cloudfunctions.net/razorpayWebhook

Subscribe to payment captured/failed events as appropriate.

## 3. Install and deploy
From this folder:
npm install -g firebase-tools
firebase login
firebase use urpptmaker
cd functions && npm install && cd ..
firebase deploy

## 4. Payment architecture
Browser -> createRazorpayOrder callable function -> Razorpay Orders API -> Razorpay Checkout -> verifyRazorpayPayment -> Firestore.
Webhook independently updates captured status.

Do not expose RAZORPAY_KEY_SECRET in browser code.
