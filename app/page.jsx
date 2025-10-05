// Landing page with redirect to chat or auth
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { JapaneseYen, Loader2 } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Three Dots, Image change krna

  // file upload 

  useEffect(() => {



    console.log("i am user", user, loading)

    if (!loading) {
      if (user) {
        console.log("i am user, redirecting to chat", user)
        router.push("/chat")
      } else {
        router.push("/auth/login")
        // router.push("/chat")
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading ChatApp...</p>
        </CardContent>
      </Card>
    </div>
  )
}
