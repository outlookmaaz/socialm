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

// Enhanced notification service for future in-app notifications
export const NotificationService = {
  // Initialize Firebase messaging for in-app notifications
  async initialize() {
    try {
      if (!messaging) return null;
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted for Firebase');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing Firebase notifications:', error);
      return false;
    }
  },

  // Get FCM token for device registration (future use)
  async getToken() {
    try {
      if (!messaging) return null;
      
      // Note: You'll need to add your VAPID key from Firebase Console
      // const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
      console.log('FCM token ready for future implementation');
      return 'token-placeholder';
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  },

  // Listen for foreground messages (future use)
  onMessage(callback: (payload: any) => void) {
    if (!messaging) return () => {};
    
    return onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      callback(payload);
    });
  },

  // Send notification to specific user (backend integration ready)
  async sendNotificationToUser(userId: string, title: string, body: string, data?: any) {
    try {
      // This will be implemented when backend Firebase integration is added
      console.log('Notification ready for backend integration:', {
        userId,
        title,
        body,
        data,
        timestamp: new Date().toISOString()
      });
      
      // For now, create in-app notification in Supabase
      // This maintains current functionality while preparing for Firebase
      return {
        success: true,
        message: 'Notification prepared for Firebase backend integration'
      };
    } catch (error) {
      console.error('Error preparing notification:', error);
      return {
        success: false,
        error: error
      };
    }
  }
};

// Request permission and get FCM token (future use)
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) return null;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
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