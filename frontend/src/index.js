import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // 🔥 StrictMode removido para evitar dupla montagem em DEV
  // que causa problemas com faceapi.js manipulando DOM
  <App />
);
