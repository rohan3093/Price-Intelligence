import React, { useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendSignInLinkToEmail,
  User
} from "firebase/auth";
import { auth } from "../utils/firebase";

interface SignInModalProps {
  onClose: () => void;
  onSignIn: (user: User) => void;
}

// Email for magic link is stored here to complete sign-in
export const EMAIL_FOR_SIGN_IN_KEY = "emailForSignIn";

export const SignInModal: React.FC<SignInModalProps> = ({ onClose, onSignIn }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError("Authentication not configured");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onSignIn(result.user);
      onClose();
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled");
      } else if (err.code === "auth/popup-blocked") {
        setError("Pop-up blocked. Please allow pop-ups and try again.");
      } else {
        setError("Failed to sign in with Google. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Email Magic Link
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth) {
      setError("Authentication not configured");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);
    setError("");

    const actionCodeSettings = {
      // URL to redirect to after clicking the link
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save email to localStorage to complete sign-in after redirect
      window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
      setEmailSent(true);
    } catch (err: any) {
      console.error("Email sign-in error:", err);
      if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address");
      } else if (err.code === "auth/missing-continue-uri") {
        setError("Configuration error. Please contact support.");
      } else {
        setError("Failed to send sign-in link. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Email sent confirmation view
  if (emailSent) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-brand-white border border-brand-gray/20 shadow-2xl" style={{ borderRadius: '0px' }}>
          <div className="p-6 md:p-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-brand-black/60 hover:text-brand-black hover:bg-brand-gray/10 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Success Icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2 text-center uppercase">
              Check Your Email
            </h2>
            <p className="text-sm text-brand-black/60 text-center mb-4">
              We sent a sign-in link to
            </p>
            <p className="text-sm font-semibold text-brand-black text-center mb-6 px-4 py-2 bg-brand-gray/10 border border-brand-gray/20">
              {email}
            </p>
            <p className="text-xs text-brand-black/60 text-center mb-6">
              Click the link in the email to sign in. The link expires in 1 hour.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setEmailSent(false)}
                className="w-full py-2.5 px-4 border border-brand-gray/30 text-brand-black text-xs font-medium hover:border-brand-black hover:bg-brand-gray/5 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                Use a different email
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-brand-black border border-brand-black text-brand-white text-xs font-medium hover:bg-brand-black/90 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-brand-white border border-brand-gray/20 shadow-2xl" style={{ borderRadius: '0px' }}>
        <div className="p-6 md:p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-brand-black/60 hover:text-brand-black hover:bg-brand-gray/10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/sentria-logo.svg" 
              alt="Sentria"
              className="h-8"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2 uppercase">
              Sign In
            </h2>
            <p className="text-sm text-brand-black/60">
              Access your watchlist, set price alerts, and more
            </p>
          </div>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 border border-brand-gray/30 bg-brand-white text-brand-black text-sm font-medium hover:border-brand-black hover:bg-brand-gray/5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            style={{ borderRadius: '0px' }}
          >
            {/* Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-brand-gray/30"></div>
            <span className="text-xs text-brand-black/40 uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-brand-gray/30"></div>
          </div>

          {/* Email Magic Link Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-xs text-brand-black/60 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-white border border-brand-gray/30 px-4 py-2.5 text-sm text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-brand-black focus:ring-2 focus:ring-brand-black/10 transition-all"
                style={{ borderRadius: '0px' }}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-3 px-4 bg-brand-black border border-brand-black text-brand-white text-sm font-medium hover:bg-brand-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ borderRadius: '0px' }}
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Sign-In Link
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <p className="text-[10px] text-brand-black/40 text-center mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy.
            We'll never share your data with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper function to check and complete magic link sign-in
// Call this on app init
export const getStoredEmailForSignIn = (): string | null => {
  return window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
};

export const clearStoredEmailForSignIn = (): void => {
  window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
};

