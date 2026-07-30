import { StrictMode } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";

import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./index.css";
import App from "./App.tsx";
import SignInPage from "./pages/SignIn.tsx";
import SignUpPage from "./pages/SignUp.tsx";
import { TokenProvider } from "./components/TokenProvider.tsx";
import { AppToaster } from "./components/ui/AppToaster.tsx";
import { ThemeProvider } from "./theme/ThemeProvider.tsx";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local");
}

registerServiceWorker();

function RootLayout() {
  const navigate = useNavigate();

  return (
    <ThemeProvider>
      <ClerkProvider
        publishableKey={publishableKey}
        routerPush={(to) => navigate(to)}
        routerReplace={(to) => navigate(to, { replace: true })}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        afterSignOutUrl="/"
      >
        <TokenProvider>
          <AppToaster />
          <Routes>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </TokenProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <RootLayout />
    </BrowserRouter>
  </StrictMode>,
);

async function registerServiceWorker() {
  if ("serviceWorker" in navigator && "PushManager" in window) {
    await navigator.serviceWorker.register("./service-worker.js");
  } else {
    console.info("Your browser does not support notifications");
  }
}