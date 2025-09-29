import { initializeApp, getApp, getApps } from 'firebase/app';

const firebaseConfig = {
  projectId: 'studio-1827235360-a2392',
  appId: '1:566379811243:web:71afa0f3621ecd8f89c2ee',
  apiKey: 'AIzaSyDhqWcnYMpmtYrqcZ5sf65kmJHRdO5TL6s',
  authDomain: 'studio-1827235360-a2392.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '566379811243',
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export { app };
