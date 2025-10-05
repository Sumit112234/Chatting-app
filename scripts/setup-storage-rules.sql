-- Firebase Storage Security Rules (to be applied in Firebase Console)
-- These rules ensure proper security for file uploads

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Chat files - users can upload to chats they participate in
    match /chats/{chatId}/{fileType}/{fileName} {
      // Allow read access to chat participants
      allow read: if request.auth != null && 
        request.auth.uid in firestore.get(/databases/(default)/documents/chats/$(chatId)).data.participants;
      
      // Allow write access to chat participants with file size limits
      allow write: if request.auth != null && 
        request.auth.uid in firestore.get(/databases/(default)/documents/chats/$(chatId)).data.participants &&
        request.resource.size < 50 * 1024 * 1024 && // 50MB limit
        request.resource.contentType.matches('image/.*|video/.*|audio/.*|application/pdf|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document|text/plain|application/zip');
    }
    
    // User profile pictures
    match /users/{userId}/profile/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId &&
        request.resource.size < 5 * 1024 * 1024 && // 5MB limit for profile pictures
        request.resource.contentType.matches('image/.*');
    }
    
    // Status/Story files
    match /status/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId &&
        request.resource.size < 10 * 1024 * 1024; // 10MB limit for status
    }
  }
}
