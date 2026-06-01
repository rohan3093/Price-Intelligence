import React, { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./utils/firebase";
import { saveUserProfileFromAuth } from "./utils/userProfile";
import { analytics } from "./utils/analytics";
import { onAuthStateChanged, User, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { EMAIL_FOR_SIGN_IN_KEY, clearStoredEmailForSignIn } from "./components/SignInModal";

const AppShell = lazy(() => import("./pages/AppShell"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LearnIndex = lazy(() => import("./pages/LearnIndex"));
const LearnArticle = lazy(() => import("./pages/LearnArticle"));

const FullScreenLoader: React.FC = () => (
  <div className="min-h-screen bg-brand-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <svg className="w-6 h-6 animate-spin text-brand-black/60" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  </div>
);

const PriceDiscoveryApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setAuthInitialized(true);
      return;
    }

    const handleMagicLinkCompletion = async () => {
      if (!auth) return;
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
        if (!email) {
          email = window.prompt("Please enter your email to confirm sign-in:");
        }
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            clearStoredEmailForSignIn();
            window.history.replaceState(null, "", window.location.pathname);
          } catch (error) {
            console.error("Error completing magic link sign-in:", error);
            setMagicLinkError("Sign-in link expired or already used. Please request a new one.");
          }
        }
      }
    };

    handleMagicLinkCompletion();

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        localStorage.setItem("analyst_email", user.email || "");
        try {
          await saveUserProfileFromAuth(user);
        } catch (error) {
          console.warn("Failed to save user profile:", error);
        }
        analytics.track("user_signed_in", {
          method: user.providerData[0]?.providerId || "unknown",
          email: user.email
        });
      } else {
        localStorage.removeItem("analyst_email");
        localStorage.removeItem("analyst_authenticated");
      }
      setCurrentUser(user);
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authInitialized) {
    return <FullScreenLoader />;
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      {magicLinkError && (
        <div className="fixed top-4 right-4 z-[100] max-w-md w-full px-4">
          <div className="flex items-center gap-3 px-4 py-3 border-2 border-red-500 bg-red-50 text-red-800 shadow-lg">
            <p className="text-sm font-medium flex-1">{magicLinkError}</p>
            <button onClick={() => setMagicLinkError(null)} className="flex-shrink-0 hover:opacity-70">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            currentUser
              ? <Navigate to="/app" replace />
              : <LandingPage onSignInClick={() => setShowSignInModal(true)} showSignInModal={showSignInModal} onCloseSignIn={() => setShowSignInModal(false)} />
          }
        />
        <Route path="/learn" element={<LearnIndex />} />
        <Route path="/learn/:slug" element={<LearnArticle />} />
        <Route
          path="/app/*"
          element={
            <AppShell
              currentUser={currentUser}
              authInitialized={authInitialized}
              onSignInClick={() => setShowSignInModal(true)}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default PriceDiscoveryApp;
