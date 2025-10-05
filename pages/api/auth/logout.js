// API route to clear session cookie
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // Clear the session cookie
    res.setHeader("Set-Cookie", "session=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/")

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Error clearing session cookie:", error)
    return res.status(500).json({ error: "Failed to clear session" })
  }
}
