"use client"

// Rich media message component for images, videos, audio, and files
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Play, Pause, Volume2, VolumeX, FileText, Video, Music, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export default function MediaMessage({ message, isOwn }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const { metadata } = message
  if (!metadata) return null

  const handleDownload = async () => {
    try {
      const response = await fetch(metadata.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = metadata.fileName || "download"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading file:", error)
    }
  }

  const renderImageMessage = () => (
    <div className="space-y-2">
      <div className="relative cursor-pointer group" onClick={() => setShowFullImage(true)}>
        <img
          src={metadata.url || "/placeholder.svg"}
          alt={metadata.fileName}
          className="max-w-xs rounded-lg object-cover"
          style={{ maxHeight: "300px" }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
          <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={cn(isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>{metadata.fileName}</span>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 w-6 p-0">
          <Download className="h-3 w-3" />
        </Button>
      </div>

      {/* Full Image Modal */}
      {showFullImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={metadata.url || "/placeholder.svg"}
            alt={metadata.fileName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  )

  const renderVideoMessage = () => (
    <div className="space-y-2">
      <video
        controls
        className="max-w-xs rounded-lg"
        style={{ maxHeight: "300px" }}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
      >
        <source src={metadata.url} type={metadata.mimeType} />
        Your browser does not support the video tag.
      </video>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Video className="h-3 w-3" />
          <span className={cn(isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {metadata.fileName}
          </span>
          {duration > 0 && (
            <Badge variant="secondary" className="text-xs">
              {formatDuration(duration)}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 w-6 p-0">
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )

  const renderAudioMessage = () => (
    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg min-w-64">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const audio = document.getElementById(`audio-${message.id}`)
          if (isPlaying) {
            audio.pause()
          } else {
            audio.play()
          }
          setIsPlaying(!isPlaying)
        }}
        className="h-8 w-8 p-0"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{metadata.fileName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const audio = document.getElementById(`audio-${message.id}`)
              audio.muted = !isMuted
              setIsMuted(!isMuted)
            }}
            className="h-6 w-6 p-0"
          >
            {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
        </div>

        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Music className="h-3 w-3" />
          <span>{formatFileSize(metadata.size)}</span>
          {duration > 0 && <span>{formatDuration(duration)}</span>}
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 w-6 p-0">
        <Download className="h-3 w-3" />
      </Button>

      <audio
        id={`audio-${message.id}`}
        src={metadata.url}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  )

  const renderDocumentMessage = () => (
    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg min-w-64">
      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
        <FileText className="h-5 w-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{metadata.fileName}</p>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {metadata.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
          </Badge>
          <span>{formatFileSize(metadata.size)}</span>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 w-8 p-0">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )

  switch (metadata.type) {
    case "image":
      return renderImageMessage()
    case "video":
      return renderVideoMessage()
    case "audio":
      return renderAudioMessage()
    case "document":
    default:
      return renderDocumentMessage()
  }
}
