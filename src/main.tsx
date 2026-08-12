import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "./AppRouter";
import { AuthProvider } from "./auth/AuthProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><AppRouter /></AuthProvider>
  </StrictMode>
);
