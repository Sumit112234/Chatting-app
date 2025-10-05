"use client"

import { useState, useRef, useEffect } from "react"
import { X, Camera, Type, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createStatus, uploadStatusMedia } from "@/lib/status"
import { useAuth } from "@/contexts/AuthContext"
import { ref, uploadBytes } from "firebase/storage"
import { storage } from "@/lib/firebase"

export default function StatusModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [statusType, setStatusType] = useState("text")
  const [textContent, setTextContent] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setStatusType(file.type.startsWith("video/") ? "video" : "image")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user || isUploading) return

    if (statusType === "text" && !textContent.trim()) return
    if ((statusType === "image" || statusType === "video") && !selectedFile) return

    setIsUploading(true)

    try {
      let mediaUrl = null

      if (selectedFile) {
        console.log("uploading media file, ", statusType, selectedFile)
        mediaUrl = await uploadStatusMedia(selectedFile, user.uid)
        console.log("media uploaded, url:", mediaUrl)
      }

      await createStatus(user.uid, statusType === "text" ? textContent : "", statusType, mediaUrl)

      // Reset form
      setTextContent("")
      setSelectedFile(null)
      setPreviewUrl("")
      setStatusType("text")
      onClose()
    } catch (error) {
      console.error("Error creating status:", error)
    } finally {
      setIsUploading(false)
    }
  }

//   const testUpload = async () => {
//   const file = new File(["hello"], "test.txt", { type: "text/plain" });
//   const storageRef = ref(storage, `tests/${Date.now()}_test.txt`);
//   await uploadBytes(storageRef, file);
//   console.log("✅ Uploaded test file!");
// };

// useEffect(() => {
//   testUpload();
// }, []);

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Create Status</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={statusType === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusType("text")
                setSelectedFile(null)
                setPreviewUrl("")
              }}
              className="flex items-center gap-2"
            >
              <Type className="h-4 w-4" />
              Text
            </Button>
            <Button
              variant={statusType !== "text" ? "default" : "outline"}
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Media
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {statusType === "text" ? (
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="What's on your mind?"
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 min-h-[120px]"
                maxLength={500}
              />
            ) : (
              <div className="space-y-4">
                {previewUrl && (
                  <div className="relative">
                    {statusType === "image" ? (
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <video src={previewUrl} className="w-full h-48 object-cover rounded-lg" controls />
                    )}
                  </div>
                )}
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Add a caption..."
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  maxLength={200}
                />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isUploading ||
                  (statusType === "text" && !textContent.trim()) ||
                  (statusType !== "text" && !selectedFile)
                }
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Share
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
