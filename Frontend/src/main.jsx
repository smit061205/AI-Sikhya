import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "plyr/dist/plyr.css";
import App from "./App.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
const CLIENT_ID =
  "959601329629-c10te78dci6fiplobeeqmi1gn2ubpj7l.apps.googleusercontent.com";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
