"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Section label shown in the error card, e.g. "Pull Requests". */
  label: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[HIL] ${this.props.label} section error:`, error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {this.props.label} failed to load
              </p>
              <p className="mt-0.5 break-words font-mono text-xs text-rose-600">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleRetry}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
