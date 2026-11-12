/**
 * Backend-controlled initial administrator provisioning script for S. SAWANT.
 *
 * Usage:
 *   1. Download your Firebase Service Account JSON key (never commit it to git).
 *   2. Set environment variables:
 *        GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *        ADMIN_EMAIL=shivaji@ssawant.in
 *        ADMIN_PASSWORD=<strong-password>
 *        ADMIN_NAME="Shivaji Sawant"
 *   3. Run:
 *        node scripts/setup-admin.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "node:fs";

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME || "Shivaji Sawant";

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error("Error: Set GOOGLE_APPLICATION_CREDENTIALS to a valid Firebase service account JSON file.");
  process.exit(1);
}

if (!adminEmail || !adminPassword || adminPassword.length < 10) {
  console.error("Error: Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (at least 10 characters) via environment variables.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

async function provisionAdmin() {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(adminEmail);
    await auth.updateUser(userRecord.uid, {
      password: adminPassword,
      displayName: adminName,
    });
    console.log(`Updated existing user: ${adminEmail}`);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      userRecord = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: adminName,
        emailVerified: true,
      });
      console.log(`Created admin user: ${adminEmail}`);
    } else {
      throw err;
    }
  }

  // Set custom claim for role-based authorization in Firebase Auth & Security Rules
  await auth.setCustomUserClaims(userRecord.uid, { admin: true, role: "admin" });

  // Sync admin role in Firestore
  await db.collection("users").doc(userRecord.uid).set(
    {
      name: adminName,
      email: adminEmail.toLowerCase(),
      role: "admin",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Administrator privileges granted to ${adminEmail} (uid: ${userRecord.uid}).`);
}

provisionAdmin().catch((err) => {
  console.error("Failed to provision admin:", err.message);
  process.exit(1);
});
