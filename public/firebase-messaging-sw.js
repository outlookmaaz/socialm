// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAXDc6PR-m2MBa0oklp9ObJggDmnvvn4RQ",
  authDomain: "mzsocialchat.firebaseapp.com",
  projectId: "mzsocialchat",
  storageBucket: "mzsocialchat.firebasestorage.app",
  messagingSenderId: "1070261752972",
  appId: "1:1070261752972:web:34575b057039e81e0997a9",
  measurementId: "G-RDCJQCQQ62"
});

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title || 'SocialChat';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification',
    icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
    badge: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
    tag: 'socialchat-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open SocialChat'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received:', event);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle push events
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);

  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'SocialChat';
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
      badge: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
      tag: 'socialchat-notification',
      requireInteraction: true,
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});