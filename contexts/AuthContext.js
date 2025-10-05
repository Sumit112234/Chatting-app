"use client"

// Authentication context for managing user state
import { createContext, useContext, useEffect, useState } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const setSessionCookie = async (user) => {
    try {
      console.log("user from cookie ", user)
      const idToken = await user.getIdToken()
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        console.error("Failed to set session cookie:", response.statusText)
      }
    } catch (error) {
      console.error("Error setting session cookie:", error)
    }
  }

  const clearSessionCookie = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      console.error("Error clearing session cookie:", error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid))
        const userData = userDoc.exists() ? userDoc.data() : {}

        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          ...userData,
        })

        await setSessionCookie(user)
      } else {
        setUser(null)
        await clearSessionCookie()
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signup = async (email, password, displayName) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)

    // Update profile with display name
    await updateProfile(user, { displayName })

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      displayName,
      email,
      photoURL: null,
      status: "Hey there! I am using ChatApp.",
      createdAt: new Date(),
      lastSeen: new Date(),
      isOnline: true,
    })

    // Send email verification
    await sendEmailVerification(user)

    await setSessionCookie(user)

    return user
  }

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    await setSessionCookie(result.user)
    return result
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const { user } = await signInWithPopup(auth, provider)

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, "users", user.uid))
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        status: "Hey there! I am using ChatApp.",
        createdAt: new Date(),
        lastSeen: new Date(),
        isOnline: true,
      })
    }

    await setSessionCookie(user)

    return user
  }

  const logout = async () => {
    // Update user status to offline before signing out
    if (user) {
      await setDoc(
        doc(db, "users", user.uid),
        {
          isOnline: false,
          lastSeen: new Date(),
        },
        { merge: true },
      )
    }

    await clearSessionCookie()
    return signOut(auth)
  }

  const value = {
    user,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
