"use client"

// File upload modal with drag and drop support
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Upload, X, File, ImageIcon, Video, Music, FileText, Camera, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { validateFile, generateThumbnail } from "@/lib/storage"

const getFileIcon = (type) => {
  switch (type) {
    case "image":
      return <ImageIcon className="h-8 w-8" />
    case "video":
      return <Video className="h-8 w-8" />
    case "audio":
      return <Music className="h-8 w-8" />
    default:
      return <FileText className="h-8 w-8" />
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export default function FileUploadModal({
  isOpen,
  onClose,
  onUpload,
  allowedTypes = ["image", "video", "audio", "document"],
  maxFiles = 10,
}) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    await processFiles(droppedFiles)
  }, [])

  const processFiles = async (fileList) => {
    const validFiles = []

    for (const file of fileList) {
      try {
        const { category } = validateFile(file)
        if (allowedTypes.includes(category)) {
          const thumbnail = await generateThumbnail(file)
          validFiles.push({
            id: Date.now() + Math.random(),
            file,
            category,
            thumbnail,
            name: file.name,
            size: file.size,
            progress: 0,
          })
        }
      } catch (error) {
        console.error(`Invalid file ${file.name}:`, error.message)
      }
    }

    setFiles((prev) => [...prev, ...validFiles].slice(0, maxFiles))
  }

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    await processFiles(selectedFiles)
  }

  const handleCameraCapture = async (e) => {
    const capturedFiles = Array.from(e.target.files)
    await processFiles(capturedFiles)
  }

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleUpload = async () => {
    if (!files.length) return

    setUploading(true)
    const uploadPromises = files.map(async (fileData) => {
      try {
        const result = await onUpload(fileData.file, fileData.category, (progress) => {
          setUploadProgress((prev) => ({
            ...prev,
            [fileData.id]: progress,
          }))
        })
        return result
      } catch (error) {
        console.error(`Error uploading ${fileData.name}:`, error)
        throw error
      }
    })

    try {
      await Promise.all(uploadPromises)
      onClose()
      setFiles([])
      setUploadProgress({})
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploading(false)
    }
  }

  const startRecording = () => {
    // Audio recording will be implemented separately
    console.log("Start audio recording")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>Share images, videos, documents, and more. Maximum {maxFiles} files.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            )}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports images, videos, audio, and documents up to 50MB
            </p>

            <div className="flex justify-center space-x-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <File className="h-4 w-4 mr-2" />
                Browse Files
              </Button>

              {allowedTypes.includes("image") && (
                <Button variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
              )}

              {allowedTypes.includes("audio") && (
                <Button variant="outline" onClick={startRecording} disabled={uploading}>
                  <Mic className="h-4 w-4 mr-2" />
                  Record
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept={allowedTypes
                .map((type) => {
                  switch (type) {
                    case "image":
                      return "image/*"
                    case "video":
                      return "video/*"
                    case "audio":
                      return "audio/*"
                    default:
                      return ".pdf,.doc,.docx,.txt,.zip"
                  }
                })
                .join(",")}
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCapture}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Selected Files ({files.length})</h4>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {files.map((fileData) => (
                    <div key={fileData.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {fileData.thumbnail ? (
                          <img
                            src={fileData.thumbnail || "/placeholder.svg"}
                            alt={fileData.name}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                            {getFileIcon(fileData.category)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fileData.name}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {fileData.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatFileSize(fileData.size)}</span>
                        </div>

                        {uploading && uploadProgress[fileData.id] !== undefined && (
                          <Progress value={uploadProgress[fileData.id]} className="mt-2 h-1" />
                        )}
                      </div>

                      <Button variant="ghost" size="sm" onClick={() => removeFile(fileData.id)} disabled={uploading}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!files.length || uploading}>
            {uploading ? "Uploading..." : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
