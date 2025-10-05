"use client"

// New chat creation modal
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Users, MessageSquare } from "lucide-react"
import { useChat } from "@/hooks/useChat"

export default function NewChatModal({ isOpen, onClose, type = "direct" }) {
  const { findUsers, createNewChat } = useChat()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName, setGroupName] = useState("")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const results = await findUsers(term)
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleUserSelect = (user) => {
    if (type === "direct") {
      setSelectedUsers([user])
    } else {
      setSelectedUsers((prev) => {
        const isSelected = prev.find((u) => u.id === user.id)
        if (isSelected) {
          return prev.filter((u) => u.id !== user.id)
        } else {
          return [...prev, user]
        }
      })
    }
  }

  const handleCreateChat = async () => {
    console.log("handleCreateChat from NewchatModal : ", { selectedUsers, groupName, type })
    if (!selectedUsers.length) return
    if (type === "group" && !groupName.trim()) return

    setLoading(true)
    try {
      const participantIds = selectedUsers.map((user) => user.id)
      console.log("participantIds before call : ", participantIds, "isGroup:", type === "group", "groupName:", groupName)
      await createNewChat(participantIds, type === "group", type === "group" ? groupName : null)
      onClose()
      // Reset form

      setSelectedUsers([])
      setGroupName("")
      setSearchTerm("")
      setSearchResults([])
    } catch (error) {
      console.error("Error creating chat:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {type === "group" ? <Users className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            <span>{type === "group" ? "Create Group" : "New Chat"}</span>
          </DialogTitle>
          <DialogDescription>
            {type === "group" ? "Create a new group chat with multiple people" : "Start a new conversation"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group Name Input */}
          {type === "group" && (
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
          )}

          {/* User Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  handleSearch(e.target.value)
                }}
                placeholder="Search by name..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 bg-accent rounded-full px-3 py-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.photoURL || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.displayName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleUserSelect(user)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="space-y-2">
            <Label>Search Results</Label>
            <ScrollArea className="h-48 border rounded-md">
              {searching ? (
                <div className="p-4 text-center text-muted-foreground">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchTerm ? "No users found" : "Start typing to search for users"}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {searchResults.map((user) => {
                    const isSelected = selectedUsers.find((u) => u.id === user.id)
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-accent"
                      >
                        {type === "group" && (
                          <Checkbox checked={!!isSelected} onChange={() => handleUserSelect(user)} />
                        )}
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL || "/placeholder.svg"} />
                          <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={
              loading ||
              !selectedUsers.length ||
              (type === "group" && !groupName.trim()) ||
              (type === "group" && selectedUsers.length < 2)
            }
          >
            {loading ? "Creating..." : type === "group" ? "Create Group" : "Start Chat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
