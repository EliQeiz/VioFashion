# VioFashion Beta Release Checklist

## Firebase Console

1. Authentication
   - Enable Email/Password.
   - Enable Google if beta users should use Google login.
   - Add authorized domains:
     - `localhost`
     - `127.0.0.1`
     - your Vercel domain

2. Firestore
   - Create the Firestore database.
   - Deploy `firestore.rules`.
   - Deploy `firestore.indexes.json`.

3. Storage
   - Create Firebase Storage.
   - Deploy `storage.rules`.

## Collections Used

- `profiles`
- `videos`
- `video_likes`
- `video_saves`
- `video_comments`
- `follows`
- `requests`
- `offers`
- `orders`
- `conversations`
- `messages`
- `notifications`
- `livestreams`

## Storage Paths Used

- `avatars/{uid}/...`
- `videos/{uid}/...`
- `portfolio/{uid}/...`
- `request-images/{uid}/...`

## Vercel

1. Import the GitHub repository into Vercel.
2. Set framework to Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add environment variable:
   - `VITE_PAYSTACK_PUBLIC_KEY`

## Local Verification

Run:

```bash
npm run check
npm audit --audit-level=moderate
```

Both should complete without errors before pushing.

## Known Beta Limitations

- In-app chat messages are stored in Firestore.
- Live streaming currently records stream metadata and has a working live-screen interaction layer, but it is not real video broadcasting yet.
- Voice/video call buttons are beta placeholders until a call provider is added.
