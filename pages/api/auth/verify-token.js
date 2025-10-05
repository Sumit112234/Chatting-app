// API route to verify Firebase ID tokens
import { adminAuth } from "@/lib/firebase-admin"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { idToken } = req.body

  if (!idToken) {
    return res.status(400).json({ error: "ID token is required" })
  }

  try {
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)

    // Set session cookie (optional - for server-side session management)
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn })

    // res.setHeader(
    //   "Set-Cookie",
    //   `session=${sessionCookie}; Max-Age=${expiresIn}; HttpOnly; Secure; SameSite=Strict; Path=/`,
    // )

    res.setHeader(
  "Set-Cookie",
  `session=${sessionCookie}; Max-Age=${expiresIn}; HttpOnly; SameSite=Strict; Path=/`
)


    return res.status(200).json({
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
    })
  } catch (error) {
    console.error("Error verifying ID token:", error)
    return res.status(401).json({ error: "Invalid token" })
  }
}
