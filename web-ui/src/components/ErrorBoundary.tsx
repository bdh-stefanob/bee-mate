'use client';
import React from 'react';

interface Props {
  fallback: React.ReactNode;
  children: React.ReactNode;
}
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <p className="text-lg font-semibold text-destructive">Qualcosa è andato storto</p>
      <p className="text-sm text-muted-foreground">Something went wrong</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
      >
        Ricarica pagina
      </button>
    </div>
  );
}
