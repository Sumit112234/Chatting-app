"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/AuthContext"
import { useChat } from "@/hooks/useChat"
import { Send, Paperclip, Smile, Mic, Square } from "lucide-react"
import MessageBubble from "./MessageBubble"
import TypingIndicator from "./TypingIndicator"
import FileUploadModal from "./FileUploadModal"
import EmojiPicker from "./EmojiPicker"
import { uploadFile, generateFilePath } from "@/lib/storage"

export default function ChatWindow({ chat }) {
  const { user } = useAuth()
  const {
    messages,
    typingUsers,
    loadChatMessages,
    loadTypingIndicators,
    sendChatMessage,
    markChatAsRead,
    setUserTyping,
  } = useChat()
  
  const [message, setMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadType, setUploadType] = useState("all")
  const [showEmoji, setShowEmoji] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const emojiRef = useRef(null)
  const attachmentMenuRef = useRef(null)

  // Get messages directly from context
  const chatMessages = messages[chat.id] || []
  const chatTypingUsers = typingUsers[chat.id] || {}

  console.log('ChatWindow render - chatId:', chat.id, 'messages count:', chatMessages.length)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages.length])

  // Set up message listeners
  useEffect(() => {
    console.log('Setting up listeners for chat:', chat.id)
    if (!chat.id) return

    // Load messages and set up real-time listener
    const unsubscribeMessages = loadChatMessages(chat.id)
    const unsubscribeTyping = loadTypingIndicators(chat.id)

    // Mark as read
    markChatAsRead(chat.id)

    return () => {
      console.log('Cleaning up listeners for chat:', chat.id)
      if (unsubscribeMessages) unsubscribeMessages()
      if (unsubscribeTyping) unsubscribeTyping()
    }
  }, [chat.id])

  // Handle typing indicator
  useEffect(() => {
    if (isTyping) {
      setUserTyping(chat.id, true)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        setUserTyping(chat.id, false)
      }, 3000)
    } else {
      setUserTyping(chat.id, false)
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [isTyping, chat.id])

  // Close attachment menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!attachmentMenuRef.current?.contains(e.target)) {
        setShowAttachmentMenu(false)
      }
    }
    if (showAttachmentMenu) {
      document.addEventListener("mousedown", handler)
    }
    return () => document.removeEventListener("mousedown", handler)
  }, [showAttachmentMenu])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!emojiRef.current?.contains(e.target)) {
        setShowEmoji(false)
      }
    }
    if (showEmoji) {
      document.addEventListener("mousedown", handler)
    }
    return () => document.removeEventListener("mousedown", handler)
  }, [showEmoji])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    const messageText = message.trim()
    console.log('Sending message:', messageText)
    
    // Clear input immediately
    setMessage("")
    setIsTyping(false)

    try {
      await sendChatMessage(chat.id, messageText)
      console.log('Message sent successfully')
    } catch (error) {
      console.error("Error sending message:", error)
      // Optionally restore message on error
      setMessage(messageText)
    }
  }

  const handleInputChange = (e) => {
    setMessage(e.target.value)

    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true)
    } else if (!e.target.value.trim() && isTyping) {
      setIsTyping(false)
    }
  }

  const handleFileUpload = (type) => {
    setUploadType(type)
    setShowFileUpload(true)
    setShowAttachmentMenu(false)
  }

  const handleFileUploadComplete = async (file, category, onProgress) => {
    try {
      const filePath = generateFilePath(user.uid, chat.id, file.name, category)
      const downloadURL = await uploadFile(file, filePath, onProgress)

      const metadata = {
        type: category,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        url: downloadURL,
        path: filePath,
      }

      await sendChatMessage(chat.id, `Shared a ${category}`, category, metadata)
      return { success: true, url: downloadURL }
    } catch (error) {
      console.error("Error uploading file:", error)
      throw error
    }
  }

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => `${prev}${emoji}`)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const handleToggleRecording = async () => {
    try {
      if (!isRecording) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream)
        recordedChunksRef.current = []
        
        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data)
          }
        }
        
        mr.onstop = async () => {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" })
            const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" })
            await handleFileUploadComplete(file, "audio", (p) => console.log("Audio upload:", p))
          } catch (err) {
            console.error("Error finalizing audio:", err)
          } finally {
            stream.getTracks().forEach((t) => t.stop())
          }
        }
        
        mr.start()
        mediaRecorderRef.current = mr
        setIsRecording(true)
      } else {
        mediaRecorderRef.current?.stop()
        setIsRecording(false)
      }
    } catch (err) {
      console.error("Mic access error:", err)
      setIsRecording(false)
    }
  }

  const typingUsersList = Object.entries(chatTypingUsers)
    .filter(([userId, data]) => data.isTyping && userId !== user?.uid)
    .map(([userId]) => ({ id: userId, name: "Someone" }))

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {chatMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === user?.uid}
              showAvatar={msg.senderId !== user?.uid}
            />
          ))}
          {typingUsersList.length > 0 && <TypingIndicator users={typingUsersList} />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <div className="flex items-end space-x-2">
          {/* Attachment Button */}
          <div className="relative" ref={attachmentMenuRef}>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            {showAttachmentMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-popover border rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  type="button"
                  onClick={() => handleFileUpload("image")}
                  className="w-full px-4 py-3 hover:bg-accent text-left text-sm"
                >
                  📷 Photo
                </button>
                <button
                  type="button"
                  onClick={() => handleFileUpload("camera")}
                  className="w-full px-4 py-3 hover:bg-accent text-left text-sm"
                >
                  📸 Camera
                </button>
                <button
                  type="button"
                  onClick={() => handleFileUpload("document")}
                  className="w-full px-4 py-3 hover:bg-accent text-left text-sm"
                >
                  📄 Document
                </button>
                <button
                  type="button"
                  onClick={() => handleFileUpload("all")}
                  className="w-full px-4 py-3 hover:bg-accent text-left text-sm"
                >
                  📎 All Files
                </button>
              </div>
            )}
          </div>

          {/* Input Field */}
          <div className="flex-1 relative" ref={emojiRef}>
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="pr-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowEmoji(!showEmoji)}
            >
              <Smile className="h-4 w-4" />
            </Button>
            
            {showEmoji && (
              <div className="absolute bottom-full right-0 mb-2">
                <EmojiPicker onSelect={handleEmojiSelect} />
              </div>
            )}
          </div>

          {/* Send/Voice Button */}
          {message.trim() ? (
            <Button 
              onClick={handleSendMessage}
              size="icon"
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              onClick={handleToggleRecording}
            >
              {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>

      {showFileUpload && (
        <FileUploadModal
          isOpen={showFileUpload}
          onClose={() => setShowFileUpload(false)}
          onUpload={handleFileUploadComplete}
          allowedTypes={
            uploadType === "image"
              ? ["image"]
              : uploadType === "camera"
                ? ["image"]
                : uploadType === "document"
                  ? ["document"]
                  : ["image", "video", "audio", "document"]
          }
        />
      )}
    </div>
  )
}
// "use client"

// import { useState, useRef, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { useAuth } from "@/contexts/AuthContext"
// import { useChat } from "@/hooks/useChat"
// import { Send, Paperclip, Smile, Mic, ImageIcon, File, Camera, Square, X } from "lucide-react"
// import MessageBubble from "./MessageBubble"
// import TypingIndicator from "./TypingIndicator"
// import FileUploadModal from "./FileUploadModal"
// import EmojiPicker from "./EmojiPicker"
// import { uploadFile, generateFilePath } from "@/lib/storage"

// export default function ChatWindow({ chat }) {
//   const { user } = useAuth()
//   const {
//     messages,
//     setMessages,
//     typingUsers,
//     loadChatMessages,
//     loadTypingIndicators,
//     sendChatMessage,
//     markChatAsRead,
//     setUserTyping,
//     chats
//   } = useChat()
//   const [message, setMessage] = useState("")
//   const [isTyping, setIsTyping] = useState(false)
//   const [showFileUpload, setShowFileUpload] = useState(false)
//   const [uploadType, setUploadType] = useState("all")
//   const [showEmoji, setShowEmoji] = useState(false)
//   const [isRecording, setIsRecording] = useState(false)
//   const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
//   const messagesEndRef = useRef(null)
//   const inputRef = useRef(null)
//   const typingTimeoutRef = useRef(null)
//   const mediaRecorderRef = useRef(null)
//   const recordedChunksRef = useRef([])
//   const emojiRef = useRef(null)
//   const attachmentMenuRef = useRef(null)

//   // console.log("Rendering ChatWindow for chat:", chat)
//   // console.log("loaded messages  : ", messages, chat.id)

//   const [chatMessages, setChatMessages] = useState(messages[chat.id] || [])
//   const chatTypingUsers = typingUsers[chat.id] || {}

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }

//   useEffect(() => {
//     scrollToBottom()
//   }, [chatMessages])

//   useEffect(() => {

//     if(!chat.id || !messages || !messages[chat.id]) return
//     console.log("hitting new useEffect : , ", chat.id,messages, messages[chat.id])
//      setChatMessages(()=>{
//       const msg = chats.find((c) => c.id === chat.id).lastMessage
//       let newMessages = [...messages[chat.id] || []]
      
//         newMessages.push({
//           id: `msg-${Date.now()}`,   
//           chatId: chat.id,
//           senderId: user.uid,
//           content: msg,
//           timestamp: new Date(),
//           type: "text",
//         })
      
//       return newMessages
//      })
//   },[chats, chat.id])


//   useEffect(() => {

//     console.log('comming into useEffect of chatwindow', chat)
//     if (!chat.id) return

//     setChatMessages(messages[chat.id] || [])

//     const unsubscribeMessages = loadChatMessages(chat.id)
//     const unsubscribeTyping = loadTypingIndicators(chat.id)

//     markChatAsRead(chat.id)

//     return () => {
//       if (unsubscribeMessages) unsubscribeMessages()
//       if (unsubscribeTyping) unsubscribeTyping()
//     }
//   }, [chat.id, loadChatMessages, loadTypingIndicators, markChatAsRead])

//   useEffect(() => {

//     console.log('isTyping value in useEffect of chatwindow', isTyping)
//     if (isTyping) {
//       setUserTyping(chat.id, true)

//       if (typingTimeoutRef.current) {
//         clearTimeout(typingTimeoutRef.current)
//       }

//       typingTimeoutRef.current = setTimeout(() => {
//         setIsTyping(false)
//         setUserTyping(chat.id, false)
//       }, 3000)
//     } else {
//       setUserTyping(chat.id, false)
//     }

//     return () => {
//       if (typingTimeoutRef.current) {
//         clearTimeout(typingTimeoutRef.current)
//       }
//     }
//   }, [isTyping, chat.id, setUserTyping])

//   // Close attachment menu when clicking outside
//   useEffect(() => {
//     const handler = (e) => {
//       if (!attachmentMenuRef.current) return
//       if (!attachmentMenuRef.current.contains(e.target)) {
//         setShowAttachmentMenu(false)
//       }
//     }
//     if (showAttachmentMenu) {
//       document.addEventListener("mousedown", handler)
//     }
//     return () => document.removeEventListener("mousedown", handler)
//   }, [showAttachmentMenu])

//   const handleSendMessage = async (e) => {
//     e.preventDefault()
//     if (!message.trim()) return

//     console.log(message, user)

//     // setChatMessages((pre) => {
//     //   const newMessage = {
//     //     id: `msg-${Date.now()}`,
//     //     chatId: chat.id,
//     //     senderId: user.uid,
//     //     content: message.trim(),
//     //     timestamp: new Date(),
//     //     type: "text",
//     //   }
//     //   return [...pre, newMessage]
//     // })

//     try {
//       await sendChatMessage(chat.id, message.trim())
//       setMessage("")
//       setIsTyping(false)
//     } catch (error) {
//       console.error("Error sending message:", error)
//     }
//   }

//   const handleInputChange = (e) => {
//     setMessage(e.target.value)

//     if (e.target.value.trim() && !isTyping) {
//       setIsTyping(true)
//     } else if (!e.target.value.trim() && isTyping) {
//       setIsTyping(false)
//     }
//   }

//   const handleFileUpload = (type) => {
//     console.log("File upload type:", type)
//     setUploadType(type)
//     setShowFileUpload(true)
//     setShowAttachmentMenu(false)
//   }

//   const handleFileUploadComplete = async (file, category, onProgress) => {
//     try {

//       // console.log(user, chat, file, category)
//       const filePath = generateFilePath(user.uid, user.uid, file.name, category)
//       console.log(filePath)
//       const downloadURL = await uploadFile(file, filePath, onProgress)

//       const metadata = {
//         type: category,
//         fileName: file.name,
//         size: file.size,
//         mimeType: file.type,
//         url: downloadURL,
//         path: filePath,
//       }

//       await sendChatMessage(chat.id, `Shared a ${category}`, category, metadata)

//       return { success: true, url: downloadURL }
//     } catch (error) {
//       console.error("Error uploading file:", error)
//       throw error
//     }
//   }

//   const handleEmojiSelect = (emoji) => {
//     setMessage((prev) => `${prev}${emoji}`)
//     setShowEmoji(false)
//     inputRef.current?.focus()
//   }

//   useEffect(() => {
//     const handler = (e) => {
//       if (!emojiRef.current) return
//       if (!emojiRef.current.contains(e.target)) setShowEmoji(false)
//     }
//     if (showEmoji) document.addEventListener("mousedown", handler)
//     return () => document.removeEventListener("mousedown", handler)
//   }, [showEmoji])

//   const handleToggleRecording = async () => {
//     try {
//       if (!isRecording) {
//         const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
//         const mr = new MediaRecorder(stream)
//         recordedChunksRef.current = []
//         mr.ondataavailable = (e) => {
//           if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
//         }
//         mr.onstop = async () => {
//           try {
//             const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" })
//             const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" })
//             await handleFileUploadComplete(file, "audio", (p) => console.log("[v0] audio upload progress", p))
//           } catch (err) {
//             console.error("[v0] Error finalizing audio:", err)
//           } finally {
//             stream.getTracks().forEach((t) => t.stop())
//           }
//         }
//         mr.start()
//         mediaRecorderRef.current = mr
//         setIsRecording(true)
//       } else {
//         mediaRecorderRef.current?.stop()
//         setIsRecording(false)
//       }
//     } catch (err) {
//       console.error("[v0] Mic access error:", err)
//       setIsRecording(false)
//     }
//   }

//   const typingUsersList = Object.entries(chatTypingUsers)
//     .filter(([userId, data]) => data.isTyping && userId !== user?.uid)
//     .map(([userId]) => ({ id: userId, name: "Someone" }))

//   return (
//     <div className="flex flex-col h-full">
//       <ScrollArea className="flex-1 p-4">
//         <div className="space-y-4">
//           {console.log('messages in render of chatwindow', messages, user, chat.id)}
//           {chatMessages.map((msg) => (
//             <MessageBubble
//               key={msg.id}
//               message={msg}
//               isOwn={msg.senderId === user?.uid}
//               showAvatar={msg.senderId !== user?.uid}
//             />
//           ))}
//           {typingUsersList.length > 0 && <TypingIndicator users={typingUsersList} />}
//           <div ref={messagesEndRef} />
//         </div>
//       </ScrollArea>

//       <div className="p-4 border-t border-border bg-card">
//         <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
//           {/* Attachment Button with Custom Menu */}
//           <div className="relative" ref={attachmentMenuRef}>
//             <Button
//               variant="ghost"
//               className="h-8 w-8 p-0"
//               size="sm"
//               type="button"
//               onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
//             >
//               <Paperclip className="h-4 w-4" />
//             </Button>

//             {/* Custom Attachment Menu */}
//             {showAttachmentMenu && (
//               <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
//                 <button
//                   type="button"
//                   onClick={() => handleFileUpload("image")}
//                   className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
//                 >
//                   <ImageIcon className="mr-3 h-4 w-4" />
//                   <span className="text-sm">Photo</span>
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => handleFileUpload("camera")}
//                   className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
//                 >
//                   <Camera className="mr-3 h-4 w-4" />
//                   <span className="text-sm">Camera</span>
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => handleFileUpload("document")}
//                   className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
//                 >
//                   <File className="mr-3 h-4 w-4" />
//                   <span className="text-sm">Document</span>
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => handleFileUpload("all")}
//                   className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
//                 >
//                   <Paperclip className="mr-3 h-4 w-4" />
//                   <span className="text-sm">All Files</span>
//                 </button>
//               </div>
//             )}
//           </div>

//           <div className="flex-1 relative" ref={emojiRef}>
//             <Input
//               ref={inputRef}
//               value={message}
//               onChange={handleInputChange}
//               placeholder="Type a message..."
//               className="pr-10 resize-none"
//               onKeyDown={(e) => {
//                 if (e.key === "Enter" && !e.shiftKey) {
//                   e.preventDefault()
//                   handleSendMessage(e)
//                 }
//               }}
//             />
//             <Button
//               variant="ghost"
//               size="sm"
//               type="button"
//               className="absolute right-1 top-1/2 transform -translate-y-1/2"
//               onClick={() => setShowEmoji((s) => !s)}
//               aria-haspopup="dialog"
//               aria-expanded={showEmoji}
//             >
//               <Smile className="h-4 w-4" />
//             </Button>
//             {showEmoji && (
//               <div className="absolute bottom-10 right-0">
//                 <EmojiPicker onSelect={handleEmojiSelect} />
//               </div>
//             )}
//           </div>

//           {message.trim() ? (
//             <Button type="submit" size="sm" className="px-3">
//               <Send className="h-4 w-4" />
//             </Button>
//           ) : (
//             <Button
//               variant={isRecording ? "destructive" : "ghost"}
//               size="sm"
//               type="button"
//               onClick={handleToggleRecording}
//               aria-pressed={isRecording}
//             >
//               {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
//             </Button>
//           )}
//         </form>
//       </div>

//       {showFileUpload && (
//         <FileUploadModal
//           isOpen={showFileUpload}
//           onClose={() => setShowFileUpload(false)}
//           onUpload={handleFileUploadComplete}
//           allowedTypes={
//             uploadType === "image"
//               ? ["image"]
//               : uploadType === "camera"
//                 ? ["image"]
//                 : uploadType === "document"
//                   ? ["document"]
//                   : ["image", "video", "audio", "document"]
//           }
//         />
//       )}
//     </div>
//   )
// }

// "use client"

// import { useState, useRef, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { useAuth } from "@/contexts/AuthContext"
// import { useChat } from "@/hooks/useChat"
// import { Send, Paperclip, Smile, Mic, ImageIcon, File, Camera, Square } from "lucide-react"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import MessageBubble from "./MessageBubble"
// import TypingIndicator from "./TypingIndicator"
// import FileUploadModal from "./FileUploadModal"
// import EmojiPicker from "./EmojiPicker"
// import { uploadFile, generateFilePath } from "@/lib/storage"

// export default function ChatWindow({ chat }) {
//   const { user } = useAuth()
//   const {
//     messages,
//     setMessages,
//     typingUsers,
//     loadChatMessages,
//     loadTypingIndicators,
//     sendChatMessage,
//     markChatAsRead,
//     setUserTyping,
//   } = useChat()
//   const [message, setMessage] = useState("")
//   const [isTyping, setIsTyping] = useState(false)
//   const [showFileUpload, setShowFileUpload] = useState(false)
//   const [uploadType, setUploadType] = useState("all")
//   const [showEmoji, setShowEmoji] = useState(false)
//   const [isRecording, setIsRecording] = useState(false)
//   const messagesEndRef = useRef(null)
//   const inputRef = useRef(null)
//   const typingTimeoutRef = useRef(null)
//   const mediaRecorderRef = useRef(null)
//   const recordedChunksRef = useRef([])
//   const emojiRef = useRef(null)

//   console.log("Rendering ChatWindow for chat:", chat)
//   console.log("loaded messages  : ", messages, chat.id)

//   const [chatMessages, setChatMessages] = useState(messages[chat.id] || [])
//   const chatTypingUsers = typingUsers[chat.id] || {}

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }

//   useEffect(() => {
//     scrollToBottom()
//   }, [chatMessages])


//   useEffect(() => {
//     if (!chat.id) return

//     setChatMessages(messages[chat.id] || [])

//     const unsubscribeMessages = loadChatMessages(chat.id)
//     const unsubscribeTyping = loadTypingIndicators(chat.id)

//     // Mark chat as read when opened
//     markChatAsRead(chat.id)

//     return () => {
//       if (unsubscribeMessages) unsubscribeMessages()
//       if (unsubscribeTyping) unsubscribeTyping()
//     }
//   }, [chat.id, loadChatMessages, loadTypingIndicators, markChatAsRead])

  
//   useEffect(() => {
//     if (isTyping) {
//       setUserTyping(chat.id, true)

//       // Clear existing timeout
//       if (typingTimeoutRef.current) {
//         clearTimeout(typingTimeoutRef.current)
//       }

//       // Set new timeout to stop typing indicator
//       typingTimeoutRef.current = setTimeout(() => {
//         setIsTyping(false)
//         setUserTyping(chat.id, false)
//       }, 3000)
//     } else {
//       setUserTyping(chat.id, false)
//     }

//     return () => {
//       if (typingTimeoutRef.current) {
//         clearTimeout(typingTimeoutRef.current)
//       }
//     }
//   }, [isTyping, chat.id, setUserTyping])

//   const handleSendMessage = async (e) => {
//     e.preventDefault()
//     if (!message.trim()) return

//     console.log(message, user)

//     setChatMessages((pre)=>{
//       const newMessage = {
//         id: `msg-${Date.now()}`,   
//         chatId: chat.id,
//         senderId: user.uid,
//         content: message.trim(),
//         timestamp: new Date(),
//         type: "text",
//       }
//       return [...pre, newMessage]
//     })

//     // setMessages((prev) => {
//     //   const chatMsgs = prev[chat.id] || []
//     //   return {
//     //     ...prev,
//     //     [chat.id]: [...chatMsgs, newMessage],
//     //     // [chat.id]: [...(prev[chat.id] || []), newMessage],  --- IGNORE ---  
//     //   }
//     // })

//     try {
//       await sendChatMessage(chat.id, message.trim())
//       setMessage("")
//       setIsTyping(false)
//     } catch (error) {
//       console.error("Error sending message:", error)
//     }
//   }

//   const handleInputChange = (e) => {
//     setMessage(e.target.value)

//     if (e.target.value.trim() && !isTyping) {
//       setIsTyping(true)
//     } else if (!e.target.value.trim() && isTyping) {
//       setIsTyping(false)
//     }
//   }

//   const handleFileUpload = (type) => {
//     console.log("File upload type:", type)
//     setUploadType(type)
//     setShowFileUpload(true)
//   }

//   const handleFileUploadComplete = async (file, category, onProgress) => {
//     try {
//       // Generate unique file path
//       const filePath = generateFilePath(user.uid, chat.id, file.name, category)

//       // Upload file to Firebase Storage
//       const downloadURL = await uploadFile(file, filePath, onProgress)

//       // Create message metadata
//       const metadata = {
//         type: category,
//         fileName: file.name,
//         size: file.size,
//         mimeType: file.type,
//         url: downloadURL,
//         path: filePath,
//       }

//       // Send message with file metadata
//       await sendChatMessage(chat.id, `Shared a ${category}`, category, metadata)

//       return { success: true, url: downloadURL }
//     } catch (error) {
//       console.error("Error uploading file:", error)
//       throw error
//     }
//   }

//   // Handle emoji selection
//   const handleEmojiSelect = (emoji) => {
//     setMessage((prev) => `${prev}${emoji}`)
//     setShowEmoji(false)
//     inputRef.current?.focus()
//   }

//   useEffect(() => {
//     const handler = (e) => {
//       if (!emojiRef.current) return
//       if (!emojiRef.current.contains(e.target)) setShowEmoji(false)
//     }
//     if (showEmoji) document.addEventListener("mousedown", handler)
//     return () => document.removeEventListener("mousedown", handler)
//   }, [showEmoji])

//   // Handle audio recording for Mic button
//   const handleToggleRecording = async () => {
//     try {
//       if (!isRecording) {
//         const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
//         const mr = new MediaRecorder(stream)
//         recordedChunksRef.current = []
//         mr.ondataavailable = (e) => {
//           if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
//         }
//         mr.onstop = async () => {
//           try {
//             const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" })
//             const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" })
//             await handleFileUploadComplete(file, "audio", (p) => console.log("[v0] audio upload progress", p))
//           } catch (err) {
//             console.error("[v0] Error finalizing audio:", err)
//           } finally {
//             stream.getTracks().forEach((t) => t.stop())
//           }
//         }
//         mr.start()
//         mediaRecorderRef.current = mr
//         setIsRecording(true)
//       } else {
//         mediaRecorderRef.current?.stop()
//         setIsRecording(false)
//       }
//     } catch (err) {
//       console.error("[v0] Mic access error:", err)
//       setIsRecording(false)
//     }
//   }

//   // Get typing users for display
//   const typingUsersList = Object.entries(chatTypingUsers)
//     .filter(([userId, data]) => data.isTyping && userId !== user?.uid)
//     .map(([userId]) => ({ id: userId, name: "Someone" })) // Will be enriched with user data

//   return (
//     <div className="flex flex-col h-full">
//       {/* Messages Area */}
//       <ScrollArea className="flex-1 p-4">
//         <div className="space-y-4">
//           {chatMessages.map((msg) => (
//             <MessageBubble
//               key={msg.id}
//               message={msg}
//               isOwn={msg.senderId === user?.uid}
//               showAvatar={msg.senderId !== user?.uid}
//             />
//           ))}
//           {typingUsersList.length > 0 && <TypingIndicator users={typingUsersList} />}
//           <div ref={messagesEndRef} />
//         </div>
//       </ScrollArea>

//       {/* Message Input */}
//       <div className="p-4 border-t border-border bg-card">
//         <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
//           {/* Attachment Menu */}
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button 
//               variant="ghost" 
//               className="h-8 w-8 p-0 cursor-pointer" 
//               size="sm" 
//               type="button"

//             >
//               <Paperclip className="h-4 w-4" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent 
//             side="top"
//             align="start"
//             className="w-48 bg-card border border-border shadow-lg z-50 fixed top-96 left-72"
//             sideOffset={5}
//           >
//             <DropdownMenuItem
//               className="cursor-pointer hover:bg-accent"
//               onClick={() => handleFileUpload("image")}
//             >
//               <ImageIcon className="mr-2 h-4 w-4" />
//               Photo
//             </DropdownMenuItem>
//             <DropdownMenuItem 
//               className="cursor-pointer hover:bg-accent" 
//               onClick={() => handleFileUpload("camera")}
//             >
//               <Camera className="mr-2 h-4 w-4" />
//               Camera
//             </DropdownMenuItem>
//             <DropdownMenuItem 
//               className="cursor-pointer hover:bg-accent" 
//               onClick={() => handleFileUpload("document")}
//             >
//               <File className="mr-2 h-4 w-4" />
//               Document
//             </DropdownMenuItem>
//             <DropdownMenuItem 
//               className="cursor-pointer hover:bg-accent" 
//               onClick={() => handleFileUpload("all")}
//             >
//               <Paperclip className="mr-2 h-4 w-4" />
//               All Files
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>

//           {/* Message Input */}
//           <div className="flex-1 relative" ref={emojiRef}>
//             <Input
//               ref={inputRef}
//               value={message}
//               onChange={handleInputChange}
//               placeholder="Type a message..."
//               className="pr-10 resize-none"
//               onKeyDown={(e) => {
//                 if (e.key === "Enter" && !e.shiftKey) {
//                   e.preventDefault()
//                   handleSendMessage(e)
//                 }
//               }}
//             />
//             <Button
//               variant="ghost"
//               size="sm"
//               type="button"
//               className="absolute right-1 top-1/2 transform -translate-y-1/2"
//               onClick={() => setShowEmoji((s) => !s)}
//               aria-haspopup="dialog"
//               aria-expanded={showEmoji}
//             >
//               <Smile className="h-4 w-4" />
//             </Button>
//             {showEmoji && (
//               <div className="absolute bottom-10 right-0">
//                 <EmojiPicker onSelect={handleEmojiSelect} />
//               </div>
//             )}
//           </div>

//           {/* Send/Voice Button */}
//           {message.trim() ? (
//             <Button type="submit" size="sm" className="px-3">
//               <Send className="h-4 w-4" />
//             </Button>
//           ) : (
//             <Button
//               variant={isRecording ? "destructive" : "ghost"}
//               size="sm"
//               type="button"
//               onClick={handleToggleRecording}
//               aria-pressed={isRecording}
//             >
//               {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
//             </Button>
//           )}
//         </form>
//       </div>

//       {showFileUpload && (
//         <FileUploadModal
//           isOpen={showFileUpload}
//           onClose={() => setShowFileUpload(false)}
//           onUpload={handleFileUploadComplete}
//           allowedTypes={
//             uploadType === "image"
//               ? ["image"]
//               : uploadType === "camera"
//                 ? ["image"]
//                 : uploadType === "document"
//                   ? ["document"]
//                   : ["image", "video", "audio", "document"]
//           }
//         />
//       )}
//     </div>
//   )
// }
