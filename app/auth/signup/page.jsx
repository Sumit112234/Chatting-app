"use client"
import AuthForm from "@/components/auth/AuthForm"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useEffect } from "react"

export default function SignupPage() {

    const { user, loading } = useAuth()
  const router = useRouter()


  useEffect(() => {
  console.log("i am user from login", user, loading)
  if (!loading) {
    if (user) {
      console.log('hitting /chat')
      router.push("/chat")
      
  } else {
      router.push("/auth/login")
      console.log('else from login')
    }
  }
}, [user, loading])


  return <AuthForm mode="signup" />
}
