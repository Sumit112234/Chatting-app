"use client"

import { useState, useEffect } from "react"
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markStatusAsViewed } from "@/lib/status"
import { useAuth } from "@/contexts/AuthContext"

export default function StatusViewer({ statuses, initialIndex = 0, onClose }) {
  const { user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const currentStatus = statuses[currentIndex]
  const duration = currentStatus?.type === "text" ? 5000 : 10000 // 5s for text, 10s for media

  useEffect(() => {
    if (!currentStatus || isPaused) return

    // Mark as viewed
    if (user && !currentStatus.viewers?.some((v) => v.userId === user.uid)) {
      markStatusAsViewed(currentStatus.id, user.uid)
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / (duration / 100)
        if (newProgress >= 100) {
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex((prev) => prev + 1)
            return 0
          } else {
            onClose()
            return 100
          }
        }
        return newProgress
      })
    }, 100)

    return () => clearInterval(interval)
  }, [currentIndex, currentStatus, isPaused, duration, statuses.length, onClose, user])

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
    }
  }

  const goToNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const statusTime = timestamp.toDate()
    const diffInHours = Math.floor((now - statusTime) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - statusTime) / (1000 * 60))
      return `${diffInMinutes}m ago`
    }
    return `${diffInHours}h ago`
  }

  if (!currentStatus) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 p-2">
        {statuses.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{
                width: index < currentIndex ? "100%" : index === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-3">
          <img
            src={currentStatus.userAvatar || "/default-avatar.png"}
            alt={currentStatus.userName}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="font-medium">{currentStatus.userName}</p>
            <p className="text-sm text-gray-300">{formatTimeAgo(currentStatus.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentStatus.viewers && (
            <div className="flex items-center gap-1 text-sm text-gray-300">
              <Eye className="h-4 w-4" />
              {currentStatus.viewers.length}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Navigation areas */}
        <div className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer" onClick={goToPrevious} />
        <div className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-pointer" onClick={goToNext} />

        {currentStatus.type === "text" ? (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ background: currentStatus.backgroundColor }}
          >
            <p className="text-white text-2xl font-medium text-center leading-relaxed">{currentStatus.content}</p>
          </div>
        ) : currentStatus.type === "image" ? (
          <img
            src={currentStatus.mediaUrl || "/placeholder.svg"}
            alt="Status"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            src={currentStatus.mediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted
            onLoadedData={() => setProgress(0)}
          />
        )}

        {currentStatus.content && currentStatus.type !== "text" && (
          <div className="absolute bottom-20 left-4 right-4">
            <p className="text-white text-lg text-center bg-black/50 rounded-lg p-3">{currentStatus.content}</p>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
        {currentIndex > 0 && (
          <Button variant="ghost" size="sm" onClick={goToPrevious} className="text-white hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {currentIndex < statuses.length - 1 && (
          <Button variant="ghost" size="sm" onClick={goToNext} className="text-white hover:bg-white/20">
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
