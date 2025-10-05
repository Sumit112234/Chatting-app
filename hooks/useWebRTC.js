"use client"

import { useState, useEffect, useRef } from "react"
import { onSnapshot, query, where, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import WebRTCService from "@/lib/webrtc"

export function useWebRTC() {
  const { user } = useAuth()
  const [currentCall, setCurrentCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [connectionState, setConnectionState] = useState("new")
  const [isCallActive, setIsCallActive] = useState(false)

  const webrtcService = useRef(new WebRTCService())

  useEffect(() => {
    if (!user) return

    // Set up WebRTC service callbacks
    webrtcService.current.onLocalStream = setLocalStream
    webrtcService.current.onRemoteStream = setRemoteStream
    webrtcService.current.onConnectionStateChange = setConnectionState

    // Listen for incoming calls
    const q = query(collection(db, "calls"), where("calleeId", "==", user.uid), where("status", "==", "calling"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const callData = { id: change.doc.id, ...change.doc.data() }
          setIncomingCall(callData)
        }
      })
    })

    return () => {
      unsubscribe()
      webrtcService.current.endCall()
    }
  }, [user])

  const startCall = async (recipientId, recipientName, recipientAvatar, isVideoCall = false) => {
    try {
      const callId = await webrtcService.current.startCall({
        recipientId,
        recipientName,
        recipientAvatar,
        callerId: user?.uid,
        callerName: user?.displayName || user?.email || "Unknown",
        callerAvatar: user?.photoURL || null,
        isVideoCall,
      })

      setCurrentCall({
        id: callId,
        participant: {
          id: recipientId,
          name: recipientName,
          avatar: recipientAvatar,
        },
        isVideoCall,
        status: "calling",
      })

      setIsCallActive(true)
      return callId
    } catch (error) {
      console.error("[v0] Error starting call:", error)
      throw error
    }
  }

  const answerCall = async (call) => {
    try {
      await webrtcService.current.answerCall(call.id)

      setCurrentCall({
        ...call,
        participant: {
          id: call.callerId,
          name: call.callerName || "Unknown",
          avatar: call.callerAvatar || null,
        },
      })

      setIncomingCall(null)
      setIsCallActive(true)
    } catch (error) {
      console.error("[v0] Error answering call:", error)
      throw error
    }
  }

  const rejectCall = async (call) => {
    try {
      await webrtcService.current.rejectCall(call.id)
      setIncomingCall(null)
    } catch (error) {
      console.error("Error rejecting call:", error)
    }
  }

  const endCall = async () => {
    try {
      await webrtcService.current.endCall()
      setCurrentCall(null)
      setLocalStream(null)
      setRemoteStream(null)
      setConnectionState("new")
      setIsCallActive(false)
    } catch (error) {
      console.error("Error ending call:", error)
    }
  }

  const toggleMute = () => {
    return webrtcService.current.toggleMute()
  }

  const toggleVideo = () => {
    return webrtcService.current.toggleVideo()
  }

  return {
    currentCall,
    incomingCall,
    localStream,
    remoteStream,
    connectionState,
    isCallActive,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  }
}
