"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useChat } from "@/hooks/useChat"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function ChatList({ searchQuery, selectedChat, onSelectChat }) {
  const { user } = useAuth()
  const { chats, loading } = useChat()
  const [enrichedChats, setEnrichedChats] = useState([])

  // Enrich chats with participant data
  useEffect(() => {

    console.log("chats in chatlist", chats)
    const enrichChats = async () => {
      if (!chats.length || !user?.uid) return

      const enriched = await Promise.all(
        chats.map(async (chat) => {
          try {
            if (chat.isGroup) {
              return {
                ...chat,
                name: chat.groupName,
                avatar: chat.groupAvatar,
                isOnline: false,
                lastSeen: "Group chat",
                type: "group",
                memberCount: chat.participants.length,
              }
            } else {
              // Find the other participant
              const otherParticipantId = chat.participants.find((id) => id !== user.uid)
              if (!otherParticipantId) return null

              const userDoc = await getDoc(doc(db, "users", otherParticipantId))
              const userData = userDoc.exists() ? userDoc.data() : {}

              return {
                ...chat,
                name: userData.displayName || "Unknown User",
                avatar: userData.photoURL,
                isOnline: userData.isOnline || false,
                lastSeen: userData.lastSeen?.toDate()?.toLocaleString() || "Unknown",
                type: "direct",
                unreadCount: chat.unreadCounts?.[user.uid] || 0,
                participantId: otherParticipantId, // <-- added
              }
            }
          } catch (error) {
            console.error("Error enriching chat:", error)
            return null
          }
        }),
      )

      setEnrichedChats(enriched.filter(Boolean))
    }

    enrichChats()
  }, [chats, user?.uid])

  // Filter chats based on search query
  const filteredChats = enrichedChats.filter(
    (chat) =>
      chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ""

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 1000 * 60 * 60 * 24) {
      // Less than 24 hours - show time
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diff < 1000 * 60 * 60 * 24 * 7) {
      // Less than a week - show day
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      // More than a week - show date
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
            <div className="h-12 w-12 bg-muted rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1 p-2">
      {filteredChats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchQuery ? "No chats found" : "No chats yet. Start a new conversation!"}
          </p>
        </div>
      ) : (
        filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent",
              selectedChat?.id === chat.id && "bg-accent",
            )}
          >
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={chat.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary text-primary-foreground">{chat.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              {chat.isOnline && chat.type === "direct" && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-foreground truncate">{chat.name}</h4>
                <span className="text-xs text-muted-foreground">{formatTimestamp(chat.lastMessageTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate flex-1">{chat.lastMessage || "No messages yet"}</p>
                {chat.unreadCount > 0 && (
                  <Badge variant="default" className="ml-2 h-5 min-w-5 text-xs bg-primary">
                    {chat.unreadCount}
                  </Badge>
                )}
              </div>
              {chat.type === "group" && (
                <p className="text-xs text-muted-foreground mt-1">{chat.memberCount} members</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
