import { collection, doc, addDoc, updateDoc, onSnapshot, serverTimestamp, getDoc } from "firebase/firestore"
import { db } from "./firebase"

class WebRTCService {
  constructor() {
    this.localStream = null
    this.remoteStream = null
    this.peerConnection = null
    this.callDoc = null
    this.callId = null
    this.isInitiator = false

    // WebRTC configuration
    this.configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    }
  }

  async initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration)

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream)
      })
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0]
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream)
      }
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callDoc) {
        const collectionName = this.isInitiator ? "callerCandidates" : "calleeCandidates"
        addDoc(collection(db, "calls", this.callId, collectionName), {
          ...event.candidate.toJSON(),
        })
      }
    }

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState)
      }
    }
  }

  async startCall({
    recipientId,
    recipientName,
    recipientAvatar,
    callerId,
    callerName,
    callerAvatar,
    isVideoCall = false,
  }) {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true,
      })

      if (this.onLocalStream) {
        this.onLocalStream(this.localStream)
      }

      // Initialize peer connection
      await this.initializePeerConnection()
      this.isInitiator = true

      // Create call document
      const callRef = await addDoc(collection(db, "calls"), {
        callerId: callerId || "unknown",
        callerName: callerName || null,
        callerAvatar: callerAvatar || null,
        calleeId: recipientId,
        calleeName: recipientName || null,
        calleeAvatar: recipientAvatar || null,
        isVideoCall,
        status: "calling",
        createdAt: serverTimestamp(),
      })

      this.callId = callRef.id
      this.callDoc = callRef

      // Create offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      // Save offer to Firestore
      await updateDoc(callRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      })

      // Listen for answer
      this.listenForAnswer()
      this.listenForRemoteCandidates()

      return this.callId
    } catch (error) {
      console.error("Error starting call:", error)
      throw error
    }
  }

  async answerCall(callId) {
    try {
      this.callId = callId
      this.callDoc = doc(db, "calls", callId)
      this.isInitiator = false

      // Get call data
      const callSnapshot = await getDoc(this.callDoc)
      const callData = callSnapshot.data()

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: callData.isVideoCall,
        audio: true,
      })

      if (this.onLocalStream) {
        this.onLocalStream(this.localStream)
      }

      // Initialize peer connection
      await this.initializePeerConnection()

      // Set remote description from offer
      await this.peerConnection.setRemoteDescription(callData.offer)

      // Create and set answer
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      // Save answer to Firestore
      await updateDoc(this.callDoc, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
        status: "connected",
      })

      this.listenForRemoteCandidates()
    } catch (error) {
      console.error("Error answering call:", error)
    }
  }

  async listenForAnswer() {
    const unsubscribe = onSnapshot(this.callDoc, (snapshot) => {
      const data = snapshot.data()
      if (data?.answer && !this.peerConnection.currentRemoteDescription) {
        this.peerConnection.setRemoteDescription(data.answer)
        updateDoc(this.callDoc, { status: "connected" })
      }
    })
    return unsubscribe
  }

  async listenForRemoteCandidates() {
    const collectionName = this.isInitiator ? "calleeCandidates" : "callerCandidates"
    const candidatesRef = collection(db, "calls", this.callId, collectionName)

    const unsubscribe = onSnapshot(candidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data())
          this.peerConnection.addIceCandidate(candidate)
        }
      })
    })
    return unsubscribe
  }

  async endCall() {
    try {
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop())
        this.localStream = null
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close()
        this.peerConnection = null
      }

      // Update call status
      if (this.callDoc) {
        await updateDoc(this.callDoc, {
          status: "ended",
          endedAt: serverTimestamp(),
        })
      }

      // Clean up
      this.callId = null
      this.callDoc = null
      this.remoteStream = null
    } catch (error) {
      console.error("Error ending call:", error)
    }
  }

  async rejectCall(callId) {
    try {
      const callRef = doc(db, "calls", callId)
      await updateDoc(callRef, {
        status: "rejected",
        endedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error rejecting call:", error)
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return !audioTrack.enabled
      }
    }
    return false
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        return !videoTrack.enabled
      }
    }
    return false
  }

  // Event handlers (to be set by components)
  onLocalStream = null
  onRemoteStream = null
  onConnectionStateChange = null
}

export default WebRTCService
