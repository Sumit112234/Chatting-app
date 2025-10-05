"use client"

import { useState, useEffect, useRef } from "react"
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function CallInterface({
  call,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  connectionState,
}) {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(!call?.isVideoCall)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Call duration timer
  useEffect(() => {
    if (connectionState === "connected") {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [connectionState])

  const handleToggleMute = () => {
    const muted = onToggleMute()
    setIsMuted(muted)
  }

  const handleToggleVideo = () => {
    const videoOff = onToggleVideo()
    setIsVideoOff(videoOff)
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case "connecting":
        return "Connecting..."
      case "connected":
        return formatDuration(callDuration)
      case "disconnected":
        return "Disconnected"
      case "failed":
        return "Connection failed"
      default:
        return "Calling..."
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-900 rounded-lg p-3 shadow-lg border border-gray-700 z-50">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={call?.participant?.avatar || "/placeholder.svg"} />
            <AvatarFallback>{call?.participant?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="text-white font-medium">{call?.participant?.name}</p>
            <p className="text-gray-400 text-xs">{getConnectionStatusText()}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(false)}
            className="text-gray-400 hover:text-white"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={call?.participant?.avatar || "/placeholder.svg"} />
              <AvatarFallback>{call?.participant?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-white font-semibold">{call?.participant?.name}</h3>
              <p className="text-gray-300 text-sm">{getConnectionStatusText()}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {call?.isVideoCall ? (
          <>
            {/* Remote Video */}
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* No video overlay */}
            {!remoteStream && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={call?.participant?.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="text-2xl">{call?.participant?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-white text-lg">Waiting for video...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Audio Call Interface */
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-6">
                <AvatarImage src={call?.participant?.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-4xl">{call?.participant?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-white text-2xl font-semibold mb-2">{call?.participant?.name}</h2>
              <p className="text-gray-300 text-lg">{getConnectionStatusText()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4">
          {/* Mute Button */}
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            onClick={handleToggleMute}
            className="w-14 h-14 rounded-full"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* Video Toggle (only for video calls) */}
          {call?.isVideoCall && (
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="lg"
              onClick={handleToggleVideo}
              className="w-14 h-14 rounded-full"
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          )}

          {/* Speaker Toggle */}
          <Button
            variant={isSpeakerOn ? "secondary" : "outline"}
            size="lg"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className="w-14 h-14 rounded-full"
          >
            {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </Button>

          {/* End Call Button */}
          <Button
            variant="destructive"
            size="lg"
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
