import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAXDc6PR-m2MBa0oklp9ObJggDmnvvn4RQ",
  authDomain: "mzsocialchat.firebaseapp.com",
  projectId: "mzsocialchat",
  storageBucket: "mzsocialchat.firebasestorage.app",
  messagingSenderId: "1070261752972",
  appId: "1:1070261752972:web:34575b057039e81e0997a9",
  measurementId: "G-RDCJQCQQ62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: any = null;

// Check if messaging is supported
const initializeMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
    }
  } catch (error) {
    console.log('Firebase messaging not supported:', error);
  }
};

// Initialize messaging
initializeMessaging();

export { app, messaging };

// Request permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) return null;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Note: You'll need to add your VAPID key from Firebase Console
      // For now, we'll just return a success without the token
      console.log('Notification permission granted');
      return 'permission-granted';
    }
    return null;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      resolve(null);
      return;
    }
    
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });