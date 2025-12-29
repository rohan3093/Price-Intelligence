import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("Error caught by boundary:", error, errorInfo);
    }

    // Track error (could send to analytics service)
    try {
      const events = JSON.parse(localStorage.getItem("analytics_events") || "[]");
      events.push({
        event: "error",
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
      const trimmed = events.slice(-1000);
      localStorage.setItem("analytics_events", JSON.stringify(trimmed));
    } catch (e) {
      // Silently fail
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-brand-white flex items-center justify-center p-4">
          <div className="max-w-md w-full border border-brand-gray/20 rounded-none p-6 bg-brand-white">
            <h1 className="text-2xl font-heading font-normal text-brand-black mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-brand-black mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-brand-black/70 cursor-pointer mb-2">
                  Error details (dev only)
                </summary>
                <pre className="text-xs bg-brand-gray/10 p-2 overflow-auto max-h-40 text-brand-black">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-none border border-brand-black bg-brand-black text-brand-white text-sm font-body hover:bg-brand-black/90"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-none border border-brand-gray/20 bg-brand-white text-brand-black text-sm font-body hover:bg-brand-gray/10"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

