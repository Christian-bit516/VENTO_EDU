import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Para el Login
import { getFirestore } from "firebase/firestore"; // Para guardar datos

const firebaseConfig = {
    apiKey: "AIzaSyCmL6jM-He3AMXUApXpONPxb001MugI8Ss",
    authDomain: "entregable-d7036.firebaseapp.com",
    projectId: "entregable-d7036",
    storageBucket: "entregable-d7036.firebasestorage.app",
    messagingSenderId: "132052786769",
    appId: "1:132052786769:web:3e128ff30c5f1ac86de270"
};

// Inicializamos la App
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas para usarlas en las páginas
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);