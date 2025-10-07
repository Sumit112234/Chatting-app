"use client"

import { useState, useEffect, useRef } from "react"
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Minimize2, Maximize2, Settings, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

const VIDEO_QUALITY_PRESETS = {
  low: {
    label: "Low (480p)",
    width: 640,
    height: 480,
    frameRate: 15,
    bitrate: 300000, // 300 kbps
  },
  medium: {
    label: "Medium (720p)",
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 1000000, // 1 Mbps
  },
  high: {
    label: "High (1080p)",
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: 2500000, // 2.5 Mbps
  },
  ultra: {
    label: "Ultra (1080p 60fps)",
    width: 1920,
    height: 1080,
    frameRate: 60,
    bitrate: 4000000, // 4 Mbps
  },
}

export default function CallInterface({
  call,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  connectionState,
  peerConnection, // WebRTC peer connection for stats
}) {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(!call?.isVideoCall)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [videoQuality, setVideoQuality] = useState("medium")
  const [connectionQuality, setConnectionQuality] = useState("good") // good, fair, poor
  const [showQualityWarning, setShowQualityWarning] = useState(false)
  const [networkStats, setNetworkStats] = useState({
    bandwidth: 0,
    packetLoss: 0,
    latency: 0,
  })

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const statsIntervalRef = useRef(null)

  // Monitor network quality
  useEffect(() => {
    if (!peerConnection || connectionState !== "connected") return

    const checkNetworkQuality = async () => {
      try {
        const stats = await peerConnection.getStats()
        let bandwidth = 0
        let packetLoss = 0
        let latency = 0

        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.mediaType === "video") {
            if (report.bytesReceived && report.timestamp) {
              bandwidth = (report.bytesReceived * 8) / 1000 // Convert to kbps
            }
            if (report.packetsLost && report.packetsReceived) {
              packetLoss = (report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100
            }
          }
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0
          }
        })

        setNetworkStats({ bandwidth, packetLoss, latency })

        // Determine connection quality
        let quality = "good"
        if (bandwidth < 500 || packetLoss > 5 || latency > 300) {
          quality = "poor"
        } else if (bandwidth < 1500 || packetLoss > 2 || latency > 150) {
          quality = "fair"
        }

        setConnectionQuality(quality)

        // Check if current quality is too high for connection
        const currentPreset = VIDEO_QUALITY_PRESETS[videoQuality]
        const requiredBandwidth = currentPreset.bitrate / 1000 // Convert to kbps

        if (bandwidth > 0 && bandwidth < requiredBandwidth * 0.7) {
          setShowQualityWarning(true)
        } else {
          setShowQualityWarning(false)
        }
      } catch (error) {
        console.error("Error checking network quality:", error)
      }
    }

    // Check quality every 3 seconds
    checkNetworkQuality()
    statsIntervalRef.current = setInterval(checkNetworkQuality, 3000)

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current)
      }
    }
  }, [peerConnection, connectionState, videoQuality])

  // Auto-adjust quality based on connection
  useEffect(() => {
    if (connectionQuality === "poor" && videoQuality !== "low") {
      // Auto-downgrade to low quality
      handleQualityChange("low", true)
    } else if (connectionQuality === "fair" && (videoQuality === "high" || videoQuality === "ultra")) {
      // Auto-downgrade to medium quality
      handleQualityChange("medium", true)
    }
  }, [connectionQuality])

  // Update video quality
  const applyVideoQuality = (quality) => {
    if (!localStream) return

    const preset = VIDEO_QUALITY_PRESETS[quality]
    const videoTrack = localStream.getVideoTracks()[0]

    if (videoTrack) {
      videoTrack
        .applyConstraints({
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.frameRate, min: Math.max(15, preset.frameRate - 15) },
        })
        .catch(console.error)

      // Apply bitrate constraints if peer connection is available
      if (peerConnection) {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video")
        if (sender) {
          const parameters = sender.getParameters()
          if (!parameters.encodings) {
            parameters.encodings = [{}]
          }
          parameters.encodings[0].maxBitrate = preset.bitrate
          sender.setParameters(parameters).catch(console.error)
        }
      }
    }
  }

  // Handle quality change
  const handleQualityChange = (quality, isAuto = false) => {
    setVideoQuality(quality)
    applyVideoQuality(quality)
    if (!isAuto) {
      setShowQualityWarning(false) // Dismiss warning if user manually changes
    }
  }

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
      applyVideoQuality(videoQuality)
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }

    // Handle remote audio for voice calls
    if (remoteAudioRef.current && remoteStream && !call?.isVideoCall) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.play().catch(console.error)
    }
  }, [remoteStream, call?.isVideoCall])

  // Call duration timer
  useEffect(() => {
    if (connectionState === "connected") {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [connectionState])

  // Handle connection state changes
  useEffect(() => {
    if (connectionState === "disconnected" || connectionState === "failed") {
      const timeout = setTimeout(() => {
        onEndCall()
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [connectionState, onEndCall])

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
        return "Call ended"
      case "failed":
        return "Connection failed"
      default:
        return "Calling..."
    }
  }

  const getConnectionIcon = () => {
    if (connectionQuality === "poor") {
      return <WifiOff className="h-4 w-4 text-red-500" />
    }
    return <Wifi className="h-4 w-4 text-green-500" />
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
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">{call?.participant?.name}</h3>
                {connectionState === "connected" && getConnectionIcon()}
              </div>
              <p className="text-gray-300 text-sm">{getConnectionStatusText()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {call?.isVideoCall && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-400 hover:text-white"
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
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

        {/* Quality Settings Panel */}
        {showSettings && call?.isVideoCall && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Video Quality</label>
                <Select value={videoQuality} onValueChange={(value) => handleQualityChange(value, false)}>
                  <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{VIDEO_QUALITY_PRESETS.low.label}</SelectItem>
                    <SelectItem value="medium">{VIDEO_QUALITY_PRESETS.medium.label}</SelectItem>
                    <SelectItem value="high">{VIDEO_QUALITY_PRESETS.high.label}</SelectItem>
                    <SelectItem value="ultra">{VIDEO_QUALITY_PRESETS.ultra.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Network Stats */}
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span
                    className={
                      connectionQuality === "good"
                        ? "text-green-500"
                        : connectionQuality === "fair"
                        ? "text-yellow-500"
                        : "text-red-500"
                    }
                  >
                    {connectionQuality.toUpperCase()}
                  </span>
                </div>
                {networkStats.bandwidth > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Bandwidth:</span>
                      <span>{Math.round(networkStats.bandwidth)} kbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Packet Loss:</span>
                      <span>{networkStats.packetLoss.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Latency:</span>
                      <span>{Math.round(networkStats.latency)} ms</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quality Warning */}
        {showQualityWarning && (
          <Alert className="mt-4 bg-yellow-900/50 border-yellow-600">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              Slow internet connection detected. Please choose lower video quality for better experience.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Video Area */}
      <div className="flex-1 relative overflow-hidden">
        {call?.isVideoCall ? (
          <>
            {/* Remote Video */}
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <video ref={remoteVideoRef} autoPlay playsInline className="max-w-full max-h-full object-contain" />
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-40 h-28 sm:w-48 sm:h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg">
              {!isVideoOff ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-gray-400" />
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
          <>
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
            {/* Hidden audio element for voice calls */}
            <audio ref={remoteAudioRef} autoPlay playsInline />
          </>
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