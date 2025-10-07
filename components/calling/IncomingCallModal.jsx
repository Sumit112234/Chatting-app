"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, PhoneOff, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function IncomingCallModal({ call, onAccept, onReject }) {
  const [callTimeout, setCallTimeout] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    // Play ringtone
    if (audioRef.current) {
      audioRef.current.play().catch(console.error)
    }

    // Auto-reject after 30 seconds of no answer
    const timeout = setTimeout(() => {
      setCallTimeout(true)
      onReject()
    }, 30000)

    return () => {
      clearTimeout(timeout)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [onReject])

  if (!call || callTimeout) return null

  return (
    <>
      <audio ref={audioRef} loop>
        <source src="/ringtone.mp3" type="audio/mpeg" />
      </audio>
      
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-2xl p-8 text-center max-w-sm w-full mx-4 border border-gray-700">
          {/* Caller Info */}
          <div className="mb-8">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={call.callerAvatar || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">{call.callerName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="text-white text-xl font-semibold mb-2">{call.callerName || "Incoming call"}</h2>
            <p className="text-gray-300">Incoming {call.isVideoCall ? "video" : "voice"} call</p>
          </div>

          {/* Animated rings */}
          <div className="relative mb-8 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-teal-500 animate-ping opacity-75"></div>
            <div
              className="absolute inset-2 rounded-full border-2 border-teal-400 animate-ping opacity-50"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="absolute inset-4 rounded-full border-2 border-teal-300 animate-ping opacity-25"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-8">
            {/* Reject Button */}
            <Button
              variant="destructive"
              size="lg"
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            {/* Accept Button */}
            <Button
              variant="default"
              size="lg"
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
            >
              {call.isVideoCall ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}