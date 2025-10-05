"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function TypingIndicator({ users = [] }) {
  if (!users.length) return null

  const displayUser = users[0] // Show first typing user
  const otherCount = users.length - 1

  return (
    <div className="flex items-end space-x-2">
      <Avatar className="h-8 w-8 mb-1">
        <AvatarImage src={displayUser.avatar || "/placeholder.svg"} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {displayUser.name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="bg-muted text-foreground px-4 py-2 rounded-2xl rounded-bl-md">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot"></div>
          </div>
          {otherCount > 0 && <span className="text-xs text-muted-foreground">+{otherCount}</span>}
        </div>
      </div>
    </div>
  )
}
