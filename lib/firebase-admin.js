// Firebase Admin SDK for server-side operations
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

const firebaseAdminConfig = {
  credential: cert({
    projectId: 'nalandafamily-f893f',
    clientEmail: process.env.NEXT_PUBLIC_CLIENT_EMAIL,
    privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
}

// console.log("Firebase Admin Config", {
//   projectId: firebaseAdminConfig.credential.projectId,
//   clientEmail: firebaseAdminConfig.credential.clientEmail,
//   privateKey: firebaseAdminConfig.credential.privateKey ? "Exists" : "Missing",
// })

// Initialize Firebase Admin (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0]

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)

export default app
