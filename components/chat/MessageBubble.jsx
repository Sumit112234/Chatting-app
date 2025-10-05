"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock, Info } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import MediaMessage from "./MediaMessage"

export default function MessageBubble({ message, isOwn, showAvatar = true }) {
  const [senderData, setSenderData] = useState(null)

  // Load sender data for non-own messages
  useEffect(() => {
    if (!isOwn && message.senderId && message.senderId !== "system") {
      const loadSenderData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", message.senderId))
          if (userDoc.exists()) {
            setSenderData(userDoc.data())
          }
        } catch (error) {
          console.error("Error loading sender data:", error)
        }
      }
      loadSenderData()
    }
  }, [message.senderId, isOwn])

  const formatTime = (timestamp) => {
    if (!timestamp) return ""
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate()
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "sending":
        return <Clock className="h-3 w-3 text-muted-foreground" />
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />
      case "read":
        return <CheckCheck className="h-3 w-3 text-primary" />
      default:
        return null
    }
  }

  // Handle system messages
  if (message.type === "system") {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted/50 px-4 py-2 rounded-full flex items-center space-x-2">
          <Info className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{message.content}</span>
        </div>
      </div>
    )
  }

  const senderName = senderData?.displayName || "Unknown User"
  const senderAvatar = senderData?.photoURL

  const hasMedia = message.type !== "text" && message.metadata

  return (
    <div className={cn("flex items-end space-x-2 message-slide-in", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && showAvatar && (
        <Avatar className="h-8 w-8 mb-1">
          <AvatarImage src={senderAvatar || "/placeholder.svg"} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{senderName.charAt(0)}</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-xs lg:max-w-md rounded-2xl",
          hasMedia ? "p-2" : "px-4 py-2",
          isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md",
        )}
      >
        {!isOwn && <p className="text-xs font-medium text-primary mb-1 px-2">{senderName}</p>}

        <div className="space-y-1">
          {hasMedia ? (
            <MediaMessage message={message} isOwn={isOwn} />
          ) : (
            <p className="text-sm leading-relaxed break-words">{message.content}</p>
          )}

          <div
            className={cn(
              "flex items-center justify-end space-x-1 text-xs",
              hasMedia ? "px-2" : "",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            <span>{formatTime(message.timestamp)}</span>
            {isOwn && getStatusIcon(message.status)}
          </div>
        </div>
      </div>

      {isOwn && showAvatar && <div className="w-8" />}
    </div>
  )
}
