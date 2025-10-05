-- Firestore Security Rules (to be applied in Firebase Console)
-- These rules ensure proper security for the chat application

-- Users collection rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Allow reading other users for search functionality
      allow read: if request.auth != null;
    }
    
    // Chat rules
    match /chats/{chatId} {
      // Users can read/write chats they participate in
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      // Allow creating new chats
      allow create: if request.auth != null && 
        request.auth.uid in request.resource.data.participants;
    }
    
    // Messages subcollection rules
    match /chats/{chatId}/messages/{messageId} {
      // Users can read messages in chats they participate in
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
      // Users can create messages in chats they participate in
      allow create: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants &&
        request.auth.uid == request.resource.data.senderId;
    }
    
    // Typing indicators
    match /chats/{chatId}/typing/{userId} {
      // Users can manage their own typing status
      allow read, write: if request.auth != null && 
        request.auth.uid == userId &&
        request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
      // Users can read typing status of others in the same chat
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
    }
  }
}
