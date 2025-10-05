// Main chat page
"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import ChatLayout from "@/components/chat/ChatLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ChatPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

 useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading chat...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <ChatLayout />
}
