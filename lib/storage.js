// Firebase Storage operations for file uploads
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "./firebase"

// File upload with progress tracking
export const uploadFile = async (file, path, onProgress = null) => {
  try {
    const storageRef = ref(storage, path)

    if (onProgress) {
      // For progress tracking, we'd use uploadBytesResumable
      const { uploadBytesResumable } = await import("firebase/storage")
      const uploadTask = uploadBytesResumable(storageRef, file)

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            onProgress(progress)
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            resolve(downloadURL)
          },
        )
      })
    } else {
      const snapshot = await uploadBytes(storageRef, file)
      return await getDownloadURL(snapshot.ref)
    }
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

// Delete file from storage
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error) {
    console.error("Error deleting file:", error)
    throw error
  }
}

// Generate unique file path
export const generateFilePath = (userId, chatId, fileName, type) => {
  const timestamp = Date.now()
  const extension = fileName.split(".").pop()
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
  return `chats/${chatId}/${type}/${userId}_${timestamp}_${sanitizedName}`
}

// Validate file type and size
export const validateFile = (file, maxSize = 50 * 1024 * 1024) => {
  // 50MB default
  const allowedTypes = {
    image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    video: ["video/mp4", "video/webm", "video/quicktime"],
    audio: ["audio/mp3", "audio/wav", "audio/ogg", "audio/m4a"],
    document: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
    ],
  }

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
  }

  // Determine file type category
  let category = "document"
  for (const [type, mimes] of Object.entries(allowedTypes)) {
    if (mimes.includes(file.type)) {
      category = type
      break
    }
  }

  return { category, isValid: true }
}

// Generate thumbnail for images/videos
export const generateThumbnail = (file) => {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(file)
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video")
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        video.currentTime = 1 // Seek to 1 second
      }

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0)
        resolve(canvas.toDataURL())
      }

      video.src = URL.createObjectURL(file)
    } else {
      resolve(null)
    }
  })
}
