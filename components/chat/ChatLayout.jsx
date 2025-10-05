"use client"

// Main chat layout component with sidebar and chat panel
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreVertical,
  Settings,
  LogOut,
  Moon,
  Sun,
  Phone,
  Video,
  Info,
  MessageSquarePlus,
  Users,
} from "lucide-react"
import ChatList from "./ChatList"
import ChatWindow from "./ChatWindow"
import UserProfile from "./UserProfile"
import NewChatModal from "./NewChatModal"
import GroupInfoModal from "./GroupInfoModal"
import StatusList from "../status/StatusList"
import CallInterface from "../calling/CallInterface"
import IncomingCallModal from "../calling/IncomingCallModal"
import { useWebRTC } from "@/hooks/useWebRTC"

export default function ChatLayout() {
  const { user, logout } = useAuth()
  const [selectedChat, setSelectedChat] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showProfile, setShowProfile] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [newChatType, setNewChatType] = useState("direct")
  const [darkMode, setDarkMode] = useState(true)

  const {
    currentCall,
    incomingCall,
    localStream,
    remoteStream,
    connectionState,
    isCallActive,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC()

  const handleLogout = async () => {
    try {
      console.log("Logging out user...")
      await logout()
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle("dark")
  }

  const handleNewChat = (type) => {
    console.log("handelNewChat", type)
    setNewChatType(type)
    setShowNewChatModal(true)
  }

  const handleVoiceCall = async () => {
    console.log("heandleVoiceCall", selectedChat)
    if (selectedChat && selectedChat.type === "direct") {
      try {
        await startCall(selectedChat.participantId, selectedChat.name, selectedChat.avatar, false)
      } catch (error) {
        console.error("Error starting voice call:", error)
      }
    }
  }

  const handleVideoCall = async () => {
    console.log("heandleVideoCall", selectedChat)
    if (selectedChat && selectedChat.type === "direct") {
      try {
        await startCall(selectedChat.participantId, selectedChat.name, selectedChat.avatar, true)
      } catch (error) {
        console.error("Error starting video call:", error)
      }
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.displayName || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 relative z-10"
            style={{ position: 'relative' }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-48 bg-card border border-border shadow-lg"
          style={{ 
            zIndex: 9999,
            position: 'fixed' 
          }}
          sideOffset={5}
        >
          <DropdownMenuItem 
            onClick={() => setShowProfile(true)}
            className="cursor-pointer hover:bg-accent"
          >
            <Settings className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={toggleDarkMode}
            className="cursor-pointer hover:bg-accent"
          >
            {darkMode ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                Dark Mode
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout} 
            className="text-destructive cursor-pointer hover:bg-accent"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b border-border">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
              onClick={() => handleNewChat("direct")}
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
              onClick={() => handleNewChat("group")}
            >
              <Users className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </div>
        </div>

        {/* Status List */}
        <StatusList />

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <ChatList searchQuery={searchQuery} selectedChat={selectedChat} onSelectChat={setSelectedChat} />
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedChat.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedChat.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedChat.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedChat.type === "group"
                        ? `${selectedChat.memberCount} members`
                        : selectedChat.isOnline
                          ? "Online"
                          : `Last seen ${selectedChat.lastSeen}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedChat.type === "direct" && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleVoiceCall}>
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleVideoCall}>
                        <Video className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setShowGroupInfo(true)}>
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Chat Window */}
            <ChatWindow chat={selectedChat} />
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquarePlus className="h-16 w-16 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Welcome to ChatApp</h2>
                <p className="text-muted-foreground max-w-md">
                  Select a chat from the sidebar to start messaging, or create a new conversation.
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <Button onClick={() => handleLogout("direct")}>
                  <MessageSquarePlus className="h-4 w-4 mr-2 cursor-pointer" />
                  Logout...!
                </Button>
                <Button onClick={() => handleNewChat("direct")}>
                  <MessageSquarePlus className="h-4 w-4 mr-2 cursor-pointer" />
                  Start New Chat
                </Button>
                <Button variant="outline" onClick={() => handleNewChat("group")}>
                  <Users className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
      {showNewChatModal && (
        <NewChatModal isOpen={showNewChatModal} onClose={() => setShowNewChatModal(false)} type={newChatType} />
      )}
      {showGroupInfo && selectedChat && (
        <GroupInfoModal isOpen={showGroupInfo} onClose={() => setShowGroupInfo(false)} chat={selectedChat} />
      )}

      {isCallActive && currentCall && (
        <CallInterface
          call={currentCall}
          localStream={localStream}
          remoteStream={remoteStream}
          connectionState={connectionState}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}

      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => answerCall(incomingCall)}
          onReject={() => rejectCall(incomingCall)}
        />
      )}
    </div>
  )
}
