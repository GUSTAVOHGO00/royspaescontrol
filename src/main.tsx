import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "./AppRouter";
import { AuthProvider } from "./auth/AuthProvider";

if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    void navigator.serviceWorker.getRegistration().then((registration) => registration?.update());
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><AppRouter /></AuthProvider>
  </StrictMode>
);
