"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Section rendering exception caught:", error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-4 max-w-[600px] rounded-card border-3 border-ink bg-[#FFF9F0] p-6 shadow-hard-4 text-center">
          <div className="text-[32px]">🩹</div>
          <h3 className="mt-2 font-display text-[18px] font-extrabold text-ink">
            {this.props.fallbackTitle || "Something went wrong loading this section"}
          </h3>
          <p className="mt-1 text-[13px] text-mute">
            Don’t worry! The rest of the shop is still working fine.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="btn-press mt-4 rounded-pill border-2.5 border-ink bg-[#FFE1A8] px-4 py-2 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] cursor-pointer"
          >
            🔄 Try Loading Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
