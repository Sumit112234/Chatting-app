// Group management operations
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  collection,
  deleteField,
} from "firebase/firestore"
import { db } from "./firebase"
import { uploadFile, generateFilePath, deleteFile } from "./storage"

// Update group information
export const updateGroupInfo = async (chatId, updates, userId) => {
  try {
    // Verify user is admin
    const chatDoc = await getDoc(doc(db, "chats", chatId))
    if (!chatDoc.exists()) throw new Error("Group not found")

    const chatData = chatDoc.data()
    if (!chatData.isGroup) throw new Error("Not a group chat")
    if (chatData.groupAdmin !== userId) throw new Error("Only admin can update group info")

    await updateDoc(doc(db, "chats", chatId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating group info:", error)
    throw error
  }
}

// Add members to group
export const addGroupMembers = async (chatId, newMemberIds, userId) => {
  try {
    // Verify user is admin
    const chatDoc = await getDoc(doc(db, "chats", chatId))
    if (!chatDoc.exists()) throw new Error("Group not found")

    const chatData = chatDoc.data()
    if (!chatData.isGroup) throw new Error("Not a group chat")
    if (chatData.groupAdmin !== userId) throw new Error("Only admin can add members")

    // Filter out existing members
    const existingMembers = chatData.participants || []
    const membersToAdd = newMemberIds.filter((id) => !existingMembers.includes(id))

    if (membersToAdd.length === 0) return

    // Initialize unread counts for new members
    const unreadUpdates = {}
    membersToAdd.forEach((memberId) => {
      unreadUpdates[`unreadCounts.${memberId}`] = 0
    })

    await updateDoc(doc(db, "chats", chatId), {
      participants: arrayUnion(...membersToAdd),
      ...unreadUpdates,
      updatedAt: serverTimestamp(),
    })

    // Send system message about new members
    const memberNames = await Promise.all(
      membersToAdd.map(async (memberId) => {
        const userDoc = await getDoc(doc(db, "users", memberId))
        return userDoc.exists() ? userDoc.data().displayName : "Unknown User"
      }),
    )

    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: "system",
      content: `${memberNames.join(", ")} ${memberNames.length === 1 ? "was" : "were"} added to the group`,
      type: "system",
      timestamp: serverTimestamp(),
      status: "delivered",
    })
  } catch (error) {
    console.error("Error adding group members:", error)
    throw error
  }
}

// Remove member from group
export const removeGroupMember = async (chatId, memberIdToRemove, userId) => {
  try {
    // Verify user is admin
    const chatDoc = await getDoc(doc(db, "chats", chatId))
    if (!chatDoc.exists()) throw new Error("Group not found")

    const chatData = chatDoc.data()
    if (!chatData.isGroup) throw new Error("Not a group chat")
    if (chatData.groupAdmin !== userId) throw new Error("Only admin can remove members")
    if (memberIdToRemove === userId) throw new Error("Admin cannot remove themselves")

    // Get member name for system message
    const memberDoc = await getDoc(doc(db, "users", memberIdToRemove))
    const memberName = memberDoc.exists() ? memberDoc.data().displayName : "Unknown User"

    await updateDoc(doc(db, "chats", chatId), {
      participants: arrayRemove(memberIdToRemove),
      [`unreadCounts.${memberIdToRemove}`]: deleteField(),
      updatedAt: serverTimestamp(),
    })

    // Send system message
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: "system",
      content: `${memberName} was removed from the group`,
      type: "system",
      timestamp: serverTimestamp(),
      status: "delivered",
    })
  } catch (error) {
    console.error("Error removing group member:", error)
    throw error
  }
}

// Leave group
export const leaveGroup = async (chatId, userId) => {
  try {
    const chatDoc = await getDoc(doc(db, "chats", chatId))
    if (!chatDoc.exists()) throw new Error("Group not found")

    const chatData = chatDoc.data()
    if (!chatData.isGroup) throw new Error("Not a group chat")

    // Get user name for system message
    const userDoc = await getDoc(doc(db, "users", userId))
    const userName = userDoc.exists() ? userDoc.data().displayName : "Unknown User"

    if (chatData.groupAdmin === userId) {
      // If admin is leaving, transfer admin to another member or delete group
      const remainingMembers = chatData.participants.filter((id) => id !== userId)

      if (remainingMembers.length === 0) {
        // Delete empty group
        await deleteDoc(doc(db, "chats", chatId))
        return
      } else {
        // Transfer admin to first remaining member
        await updateDoc(doc(db, "chats", chatId), {
          participants: arrayRemove(userId),
          groupAdmin: remainingMembers[0],
          [`unreadCounts.${userId}`]: deleteField(),
          updatedAt: serverTimestamp(),
        })

        // Send system message about admin transfer
        const newAdminDoc = await getDoc(doc(db, "users", remainingMembers[0]))
        const newAdminName = newAdminDoc.exists() ? newAdminDoc.data().displayName : "Unknown User"

        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: "system",
          content: `${userName} left the group. ${newAdminName} is now the admin.`,
          type: "system",
          timestamp: serverTimestamp(),
          status: "delivered",
        })
      }
    } else {
      // Regular member leaving
      await updateDoc(doc(db, "chats", chatId), {
        participants: arrayRemove(userId),
        [`unreadCounts.${userId}`]: deleteField(),
        updatedAt: serverTimestamp(),
      })

      // Send system message
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: "system",
        content: `${userName} left the group`,
        type: "system",
        timestamp: serverTimestamp(),
        status: "delivered",
      })
    }
  } catch (error) {
    console.error("Error leaving group:", error)
    throw error
  }
}

// Update group avatar
export const updateGroupAvatar = async (chatId, file, userId) => {
  try {
    // Verify user is admin
    const chatDoc = await getDoc(doc(db, "chats", chatId))
    if (!chatDoc.exists()) throw new Error("Group not found")

    const chatData = chatDoc.data()
    if (!chatData.isGroup) throw new Error("Not a group chat")
    if (chatData.groupAdmin !== userId) throw new Error("Only admin can update group avatar")

    // Delete old avatar if exists
    if (chatData.groupAvatarPath) {
      try {
        await deleteFile(chatData.groupAvatarPath)
      } catch (error) {
        console.warn("Could not delete old avatar:", error)
      }
    }

    // Upload new avatar
    const avatarPath = generateFilePath(userId, chatId, file.name, "avatar")
    const avatarURL = await uploadFile(file, avatarPath)

    await updateDoc(doc(db, "chats", chatId), {
      groupAvatar: avatarURL,
      groupAvatarPath: avatarPath,
      updatedAt: serverTimestamp(),
    })

    return avatarURL
  } catch (error) {
    console.error("Error updating group avatar:", error)
    throw error
  }
}

// Make member admin
export const makeGroupAdmin = async (chatId, newAdminId, currentAdminId) => {
  try {
    // Verify current user is admin
    const chatDoc = await getDoc(doc(db, "chats", chatId))
    if (!chatDoc.exists()) throw new Error("Group not found")

    const chatData = chatDoc.data()
    if (!chatData.isGroup) throw new Error("Not a group chat")
    if (chatData.groupAdmin !== currentAdminId) throw new Error("Only admin can transfer admin rights")
    if (!chatData.participants.includes(newAdminId)) throw new Error("User is not a group member")

    // Get names for system message
    const [currentAdminDoc, newAdminDoc] = await Promise.all([
      getDoc(doc(db, "users", currentAdminId)),
      getDoc(doc(db, "users", newAdminId)),
    ])

    const currentAdminName = currentAdminDoc.exists() ? currentAdminDoc.data().displayName : "Unknown User"
    const newAdminName = newAdminDoc.exists() ? newAdminDoc.data().displayName : "Unknown User"

    await updateDoc(doc(db, "chats", chatId), {
      groupAdmin: newAdminId,
      updatedAt: serverTimestamp(),
    })

    // Send system message
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: "system",
      content: `${currentAdminName} made ${newAdminName} the group admin`,
      type: "system",
      timestamp: serverTimestamp(),
      status: "delivered",
    })
  } catch (error) {
    console.error("Error making group admin:", error)
    throw error
  }
}

// Get group members with details
export const getGroupMembers = async (chatId) => {
  try {
    const chatDoc = await getDoc(doc(db, "chats", chatId))
    if (!chatDoc.exists()) throw new Error("Group not found")

    const chatData = chatDoc.data()
    if (!chatData.isGroup) throw new Error("Not a group chat")

    const memberDetails = await Promise.all(
      chatData.participants.map(async (memberId) => {
        const userDoc = await getDoc(doc(db, "users", memberId))
        const userData = userDoc.exists() ? userDoc.data() : {}
        return {
          id: memberId,
          displayName: userData.displayName || "Unknown User",
          email: userData.email || "",
          photoURL: userData.photoURL || null,
          isOnline: userData.isOnline || false,
          lastSeen: userData.lastSeen,
          isAdmin: memberId === chatData.groupAdmin,
        }
      }),
    )

    return memberDetails
  } catch (error) {
    console.error("Error getting group members:", error)
    throw error
  }
}
