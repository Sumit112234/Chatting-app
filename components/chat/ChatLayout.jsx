"use client"

// Main chat layout component with sidebar and chat panel - Responsive version
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
  ArrowLeft,
  Menu,
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
  const [showSidebar, setShowSidebar] = useState(true)

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

  const handleSelectChat = (chat) => {
    setSelectedChat(chat)
    // Hide sidebar on mobile when chat is selected
    if (window.innerWidth < 768) {
      setShowSidebar(false)
    }
  }

  const handleBackToChats = () => {
    setShowSidebar(true)
    // Optional: clear selected chat on mobile
    if (window.innerWidth < 768) {
      setSelectedChat(null)
    }
  }

  const handleRejectCall = async (call) => {
    try {
      await rejectCall(call)
      // The call should automatically close due to WebRTC hook handling
    } catch (error) {
      console.error("Error rejecting call:", error)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Hidden on mobile when chat is selected */}
      <div 
        className={`
          w-full md:w-80 border-r border-border bg-card flex flex-col h-screen
          ${showSidebar ? 'flex' : 'hidden md:flex'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 flex-shrink-0">
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
                  className="h-8 w-8 p-0 relative z-10 flex-shrink-0"
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
              <span className="hidden sm:inline">New Chat</span>
              <span className="sm:hidden">Chat</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
              onClick={() => handleNewChat("group")}
            >
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Group</span>
              <span className="sm:hidden">Group</span>
            </Button>
          </div>
        </div>

        {/* Status List */}
        <div className="flex-shrink-0">
          <StatusList />
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <ChatList searchQuery={searchQuery} selectedChat={selectedChat} onSelectChat={handleSelectChat} />
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div 
        className={`
          flex-1 flex flex-col h-screen overflow-hidden
          ${!showSidebar || selectedChat ? 'flex' : 'hidden md:flex'}
        `}
      >
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Back button - always visible */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 flex-shrink-0"
                    onClick={handleBackToChats}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={selectedChat.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedChat.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{selectedChat.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedChat.type === "group"
                        ? `${selectedChat.memberCount} members`
                        : selectedChat.isOnline
                          ? "Online"
                          : `Last seen ${selectedChat.lastSeen}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  {selectedChat.type === "direct" && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleVoiceCall} className="h-8 w-8 p-0 sm:h-9 sm:w-9">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleVideoCall} className="h-8 w-8 p-0 sm:h-9 sm:w-9">
                        <Video className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setShowGroupInfo(true)} className="h-8 w-8 p-0 sm:h-9 sm:w-9">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 overflow-hidden">
              <ChatWindow chat={selectedChat} />
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center bg-background p-4 overflow-y-auto">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquarePlus className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Welcome to ChatApp</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Select a chat from the sidebar to start messaging, or create a new conversation.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                <Button onClick={() => handleLogout()} className="w-full sm:w-auto">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
                <Button onClick={() => handleNewChat("direct")} className="w-full sm:w-auto">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
                <Button variant="outline" onClick={() => handleNewChat("group")} className="w-full sm:w-auto">
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
          peerConnection={currentCall.peerConnection}
        />
      )}

      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => answerCall(incomingCall)}
          onReject={() => handleRejectCall(incomingCall)}
        />
      )}
    </div>
  )
}