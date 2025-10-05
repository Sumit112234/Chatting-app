-- Firestore Security Rules for WebRTC Calling

-- Add these rules to your Firestore Security Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Calls collection rules
    match /calls/{callId} {
      // Allow read/write for participants in the call
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.callerId || 
         request.auth.uid == resource.data.calleeId);
      
      // Allow creation of new calls
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.callerId;
      
      // ICE candidates subcollections
      match /callerCandidates/{candidateId} {
        allow read, write: if request.auth != null && 
          (request.auth.uid == get(/databases/$(database)/documents/calls/$(callId)).data.callerId ||
           request.auth.uid == get(/databases/$(database)/documents/calls/$(callId)).data.calleeId);
      }
      
      match /calleeCandidates/{candidateId} {
        allow read, write: if request.auth != null && 
          (request.auth.uid == get(/databases/$(database)/documents/calls/$(callId)).data.callerId ||
           request.auth.uid == get(/databases/$(database)/documents/calls/$(callId)).data.calleeId);
      }
    }
  }
}
