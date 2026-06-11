import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../utils/firebase";

interface AnalystLoginProps {
  onLogin: () => void;
  onClose?: () => void;
}

export const AnalystLogin: React.FC<AnalystLoginProps> = ({ onLogin, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!auth) {
      setError("Firebase Authentication is not configured. Please check your environment variables.");
      setIsLoading(false);
      return;
    }

    try {
      // Sign in with Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);
      // Firebase Auth automatically persists the session
      setIsLoading(false);
      onLogin();
    } catch (error: any) {
      console.error("Login error:", error);
      setIsLoading(false);
      
      // Provide user-friendly error messages
      if (error.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (error.code === "auth/user-not-found") {
        setError("No account found with this email");
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later");
      } else {
        setError("Invalid email or password");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-brand-white border border-brand-gray/20 rounded-none shadow-modal">
        <div className="p-6 md:p-8">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-brand-black hover:text-brand-gray text-lg px-2 py-1"
            >
              ✕
            </button>
          )}
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2 uppercase">
            Analyst Login
          </h2>
          <p className="text-sm text-brand-black/60 mb-6">
            Enter your credentials to access the analyst dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body text-brand-black mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-white border border-brand-gray/20 rounded-none px-4 py-2.5 text-xs font-body text-brand-black placeholder:text-brand-gray focus:outline-none focus:border-terminal-border-strong"
                placeholder="Enter your email"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-body text-brand-black mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-white border border-brand-gray/20 rounded-none px-4 py-2.5 text-xs font-body text-brand-black placeholder:text-brand-gray focus:outline-none focus:border-terminal-border-strong"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-down/10 border border-down/30 rounded-none">
                <p className="text-xs text-down">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-accent text-terminal-bg border border-accent rounded-none text-xs font-body font-medium hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

