# PoolTracker Setup Instructions

## Firebase Configuration

To prevent crashes on app launch, you need to set up Firebase configuration properly.

### 1. Create a .env file

Create a `.env` file in the root directory of your project with the following content:

```
# Firebase Configuration
# Replace these values with your actual Firebase project credentials
FIREBASE_API_KEY=your_actual_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:ios:abcdef123456
```

### 2. Get Your Firebase Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click on the gear icon (⚙️) next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. If you don't have an iOS app, click "Add app" and select iOS
7. Copy the configuration values from the provided config object

### 3. Update the .env file

Replace the placeholder values in your `.env` file with the actual values from your Firebase project.

### 4. Rebuild the App

After updating the `.env` file, rebuild your app:

```bash
# For iOS
expo run:ios

# For Android
expo run:android
```

## Important Notes

- The app now has error handling to prevent crashes when Firebase is not properly configured
- However, for full functionality, you need valid Firebase credentials
- Make sure to add the `.env` file to your `.gitignore` to keep your credentials secure
- The app will show appropriate error messages if Firebase is not available

## Troubleshooting

If you're still experiencing crashes:

1. Make sure the `.env` file is in the root directory
2. Verify all Firebase configuration values are correct
3. Check that your Firebase project has Authentication enabled
4. Ensure your Firebase project has Firestore Database enabled
5. Check the console logs for any specific error messages 