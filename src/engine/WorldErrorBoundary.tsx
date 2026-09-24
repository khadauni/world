import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Catches WebGL / scene crashes so the learning flow (HUD, narration, quizzes) keeps working in story mode. */
export class WorldErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: () => void }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[world] scene crashed', error, info.componentStack);
    this.props.onError?.();
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
