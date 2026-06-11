// firebase/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2waUUjLLsqRLP9FzrfDVOEAwVI2gQZQ0",
  authDomain: "bgafutwear.firebaseapp.com",
  projectId: "bgafutwear",
  storageBucket: "bgafutwear.firebasestorage.app",
  messagingSenderId: "49919867573",
  appId: "1:49919867573:web:11a461045b4f966acb1cfc"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios para usarlos en otros archivos
export const db = getFirestore(app);
export const auth = getAuth(app);