import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDocs,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage } from "./firebase"



export const createStatus = async (userId, content, type = "text", mediaUrl = null) => {
  try {
    const statusData = {
      userId,
      content,
      type, // 'text', 'image', 'video'
      mediaUrl,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      viewers: [],
      backgroundColor: type === "text" ? getRandomStatusColor() : null,
    }

    const docRef = await addDoc(collection(db, "status"), statusData)
    return docRef.id
  } catch (error) {
    console.error("Error creating status:", error)
    throw error
  }
}

export const uploadStatusMedia = async (file, userId) => {
  try {
    const timestamp = Date.now()
    const fileName = `status/${userId}/${timestamp}_${file.name}`
    const storageRef = ref(storage, fileName)

    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)

    return downloadURL
  } catch (error) {
    console.error("Error uploading status media:", error)
    throw error
  }
}

export const getUserStatuses = (userId, callback) => {
  const q = query(
    collection(db, "status"),
    where("userId", "==", userId),
    where("expiresAt", ">", new Date()),
    orderBy("expiresAt"),
    orderBy("createdAt", "desc"),
  )

  return onSnapshot(q, callback)
}

export const getAllActiveStatuses = (callback) => {
  const q = query(
    collection(db, "status"),
    where("expiresAt", ">", new Date()),
    orderBy("expiresAt"),
    orderBy("createdAt", "desc"),
  )

  return onSnapshot(q, callback)
}


export const markStatusAsViewed = async (statusId, viewerId) => {
  try {
    const statusRef = doc(db, "status", statusId)
    await updateDoc(statusRef, {
      viewers: arrayUnion(viewerId),
      lastViewedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error marking status as viewed:", error)
    throw error
  }
}


export const deleteStatus = async (statusId, mediaUrl = null) => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, "status", statusId))

    // Delete media from Storage if exists
    if (mediaUrl) {
      const mediaRef = ref(storage, mediaUrl)
      await deleteObject(mediaRef)
    }
  } catch (error) {
    console.error("Error deleting status:", error)
    throw error
  }
}

export const cleanupExpiredStatuses = async () => {
  try {
    const q = query(collection(db, "status"), where("expiresAt", "<=", new Date()))

    const snapshot = await getDocs(q)
    const deletePromises = snapshot.docs.map((doc) => {
      const data = doc.data()
      return deleteStatus(doc.id, data.mediaUrl)
    })

    await Promise.all(deletePromises)
  } catch (error) {
    console.error("Error cleaning up expired statuses:", error)
  }
}

const getRandomStatusColor = () => {
  const colors = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
