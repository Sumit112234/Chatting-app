"use client"

// Custom hook for chat functionality
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  getUserChats,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  updateUserPresence,
  setTypingStatus,
  getTypingUsers,
  createChat,
  searchUsers,
} from "@/lib/firestore"

export const useChat = () => {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState({})
  const [typingUsers, setTypingUsers] = useState({})
  const [loading, setLoading] = useState(true)

  // Load user's chats
  useEffect(() => {
    if (!user?.uid) return

    const unsubscribe = getUserChats(user.uid, (snapshot) => {
      const chatsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setChats(chatsData)
      setLoading(false)
    })

    return unsubscribe
  }, [user?.uid])

  // Update user presence
  useEffect(() => {
    if (!user?.uid) return

    updateUserPresence(user.uid, true)

    const handleBeforeUnload = () => {
      updateUserPresence(user.uid, false)
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      updateUserPresence(user.uid, false)
    }
  }, [user?.uid])

  // Load messages for a specific chat
  const loadChatMessages = useCallback(
    (chatId) => {
      console.log("before loaded")
      if (messages[chatId]) return // Already loaded
      console.log("after loaded")

      const unsubscribe = getChatMessages(chatId, (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }))

        setMessages((prev) => ({
          ...prev,
          [chatId]: messagesData,
        }))
      })

      return unsubscribe
    },
    [messages],
  )

  // Load typing indicators for a chat
  const loadTypingIndicators = useCallback(
    (chatId) => {
      const unsubscribe = getTypingUsers(chatId, (snapshot) => {
        const typing = {}
        snapshot.docs.forEach((doc) => {
          if (doc.id !== user?.uid) {
            typing[doc.id] = doc.data()
          }
        })

        setTypingUsers((prev) => ({
          ...prev,
          [chatId]: typing,
        }))
      })

      return unsubscribe
    },
    [user?.uid],
  )

  // Send a message
  const sendChatMessage = useCallback(
    async (chatId, content, type = "text", metadata = null) => {
      if (!user?.uid || !content.trim()) return

      try {
        await sendMessage(chatId, user.uid, content.trim(), type, metadata)
        console.log("message sended succesfully")
      } catch (error) {
        console.error("Error sending message:", error)
        throw error
      }
    },
    [user?.uid],
  )

  // Mark messages as read
  const markChatAsRead = useCallback(
    async (chatId) => {
      if (!user?.uid) return

      try {
        await markMessagesAsRead(chatId, user.uid)
      } catch (error) {
        console.error("Error marking chat as read:", error)
      }
    },
    [user?.uid],
  )

  // Set typing status
  const setUserTyping = useCallback(
    async (chatId, isTyping) => {
      if (!user?.uid) return

      try {
        await setTypingStatus(chatId, user.uid, isTyping)
      } catch (error) {
        console.error("Error setting typing status:", error)
      }
    },
    [user?.uid],
  )

  const updateUser = useCallback(
    async (details) => {
      if (!user?.uid) return

      try {
        await setTypingStatus(chatId, user.uid, isTyping)
      } catch (error) {
        console.error("Error setting typing status:", error)
      }
    },
    [user?.uid],
  )

  // Create new chat
  const createNewChat = useCallback(
    async (participantIds, isGroup = false, groupName = null) => {
      if (!user?.uid) return

      try {
        const participants = [user.uid, ...participantIds]
        const chatId = await createChat(participants, isGroup, groupName)
        return chatId
      } catch (error) {
        console.error("Error creating chat:", error)
        throw error
      }
    },
    [user?.uid],
  )

  // Search for users
  const findUsers = useCallback(
    async (searchTerm) => {
      if (!user?.uid || !searchTerm.trim()) return []

      try {
        return await searchUsers(searchTerm.trim(), user.uid)
      } catch (error) {
        console.error("Error searching users:", error)
        return []
      }
    },
    [user?.uid],
  )

  return {
    chats,
    messages,
    setMessages,
    typingUsers,
    loading,
    loadChatMessages,
    loadTypingIndicators,
    sendChatMessage,
    markChatAsRead,
    setUserTyping,
    createNewChat,
    findUsers,
    updateUser
  }
}
