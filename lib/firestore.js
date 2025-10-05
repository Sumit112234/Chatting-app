// Firestore database operations and real-time subscriptions
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  setDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import { getAuth } from "firebase/auth"

// Chat operations
export const createChat = async (participants, isGroup = false, groupName = null) => {
  try {
    const chatData = {
      participants,
      isGroup,
      groupName,
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageTime: serverTimestamp(),
      unreadCounts: participants.reduce((acc, userId) => ({ ...acc, [userId]: 0 }), {}),
    }

    if (isGroup) {
      chatData.groupAdmin = participants[0]
      chatData.groupAvatar = null
    }

    const chatRef = await addDoc(collection(db, "chats"), chatData)
    return chatRef.id
  } catch (error) {
    console.error("Error creating chat:", error)
    throw error
  }
}

export const getUserChats = (userId, callback) => {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageTime", "desc"),
  )

  return onSnapshot(q, callback)
}

export const getChatMessages = (chatId, callback) => {
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"), limit(100))

  return onSnapshot(q, callback)
}

// Message operations
export const sendMessage = async (chatId, senderId, content, type = "text", metadata = null) => {
  try {
    const messageData = {
      senderId,
      content,
      type,
      timestamp: serverTimestamp(),
      status: "sent",
      metadata,
    }

    // Add message to subcollection
    await addDoc(collection(db, "chats", chatId, "messages"), messageData)

    // Update chat's last message
    const lastMessageText = type === "text" ? content : `Shared a ${type}`
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: lastMessageText,
      lastMessageTime: serverTimestamp(),
    })

    // Update unread counts for other participants
    const chatDoc = await getDoc(doc(db, "chats", chatId))
    if (chatDoc.exists()) {
      const chatData = chatDoc.data()
      const updates = {}
      chatData.participants.forEach((participantId) => {
        if (participantId !== senderId) {
          updates[`unreadCounts.${participantId}`] = increment(1)
        }
      })
      await updateDoc(doc(db, "chats", chatId), updates)
    }
  } catch (error) {
    console.error("Error sending message:", error)
    throw error
  }
}

export const markMessagesAsRead = async (chatId, userId) => {
  try {
    await updateDoc(doc(db, "chats", chatId), {
      [`unreadCounts.${userId}`]: 0,
    })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    throw error
  }
}

// User operations
export const updateUserPresence = async (userId, isOnline) => {
  
  const auth = getAuth();
  console.log("current user", auth.currentUser)
    try {
    const userRef = doc(db, "users", userId)
    await setDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp(),
    }, { merge: true })  
  } catch (error) {
    console.error("Error updating presence:", error)
    throw error
  }
}

export const updateUser = async (userId, details) => {
  
  // const auth = getAuth();
  // console.log("current user", auth.currentUser)
  try {
    const userRef = doc(db, "users", userId)
    await setDoc(userRef, {
      ...details,
      lastSeen: serverTimestamp(),
    }, { merge: true }) 
  } catch (error) {
    console.error("Error updating user:", error)
    throw error
  }
}

export const getUserPresence = (userId, callback) => {
  return onSnapshot(doc(db, "users", userId), callback)
}

export const searchUsers = async (searchTerm, currentUserId) => {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("displayName", ">=", searchTerm), where("displayName", "<=", searchTerm + "\uf8ff"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((user) => user.id !== currentUserId)
  } catch (error) {
    console.error("Error searching users:", error)
    throw error
  }
}

// Typing indicators
export const setTypingStatus = async (chatId, userId, isTyping) => {
  try {
    const typingRef = doc(db, "chats", chatId, "typing", userId)
    if (isTyping) {
    await setDoc(typingRef, {
      isTyping: true,
      timestamp: serverTimestamp(),
    }, { merge: true });
    } else {
      await deleteDoc(typingRef)
    }
  } catch (error) {
    console.error("Error setting typing status:", error)
  }
}

export const getTypingUsers = (chatId, callback) => {
  const q = query(collection(db, "chats", chatId, "typing"))
  return onSnapshot(q, callback)
}
