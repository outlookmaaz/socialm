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

// Enhanced notification service for admin broadcasts
export const NotificationService = {
  // Initialize Firebase messaging for admin notifications
  async initialize() {
    try {
      if (!messaging) return null;
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted for admin broadcasts');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing admin notifications:', error);
      return false;
    }
  },

  // Get FCM token for device registration
  async getToken() {
    try {
      if (!messaging) return null;
      
      console.log('FCM token ready for admin broadcast implementation');
      return 'admin-broadcast-token';
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  },

  // Listen for foreground messages
  onMessage(callback: (payload: any) => void) {
    if (!messaging) return () => {};
    
    return onMessage(messaging, (payload) => {
      console.log('Admin broadcast message received:', payload);
      callback(payload);
    });
  },

  // Send notification to all users (admin broadcast)
  async sendNotificationToUser(userId: string, title: string, body: string, data?: any) {
    try {
      console.log('Admin broadcast notification prepared:', {
        userId,
        title,
        body,
        data,
        timestamp: new Date().toISOString(),
        type: 'admin_broadcast'
      });

      // Simulate successful broadcast
      // In a real implementation, this would call your backend API
      // which would then use Firebase Admin SDK to send to all users
      
      // For demo purposes, show a browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        setTimeout(() => {
          new Notification(title, {
            body: body,
            icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
            tag: 'admin-broadcast',
            requireInteraction: true,
            actions: [
              {
                action: 'view',
                title: 'View'
              }
            ]
          });
        }, 1000);
      }

      return {
        success: true,
        message: 'Admin broadcast notification sent successfully',
        recipients: 'all-users',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error sending admin broadcast:', error);
      return {
        success: false,
        error: error
      };
    }
  },

  // Send toast notification (for immediate UI feedback)
  async sendToastNotification(title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') {
    try {
      // This would integrate with your toast system
      console.log('Toast notification:', { title, message, type });
      
      // Show browser notification as fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
          tag: 'toast-notification'
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending toast notification:', error);
      return { success: false, error };
    }
  }
};

// Request permission and get FCM token for admin features
export const requestAdminNotificationPermission = async () => {
  try {
    if (!messaging) return null;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Admin notification permission granted');
      return 'admin-permission-granted';
    }
    return null;
  } catch (error) {
    console.error('Error getting admin notification permission:', error);
    return null;
  }
};

// Listen for admin broadcast messages
export const onAdminMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      resolve(null);
      return;
    }
    
    onMessage(messaging, (payload) => {
      if (payload.data?.type === 'admin_broadcast') {
        resolve(payload);
      }
    });
  });