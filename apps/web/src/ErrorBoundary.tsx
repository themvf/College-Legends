import { Component, type ErrorInfo, type ReactElement, type ReactNode } from "react";

/**
 * The last thing between a render error and a blank document.
 *
 * A hook placed below an early return once unmounted the entire app on the
 * recruiting board — no message, no way back, and the career still sitting in
 * the worker and the autosave. A cold player reproduced it three times out of
 * three and concluded the game was broken, which is the correct conclusion to
 * draw from a white screen.
 *
 * React unmounts the whole tree when a render throws and nothing catches it,
 * so the absence of a boundary is what turns any single-screen bug into a total
 * loss. The career is *not* lost in that situation: the simulation lives in a
 * worker and the autosave is on disk, so the honest thing to say is that
 * reloading resumes where you were.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; scope: string; onReset?: (() => void) | undefined },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept, because the browser console is where this gets diagnosed and a
    // caught error is otherwise invisible to anyone testing.
    console.error(`[${this.props.scope}] render failed`, error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <RenderFailure
      scope={this.props.scope}
      error={error}
      onRetry={this.props.onReset ? () => { this.props.onReset?.(); this.setState({ error: null }); } : undefined}
    />;
  }
}

function RenderFailure({ scope, error, onRetry }: {
  scope: string; error: Error; onRetry?: (() => void) | undefined;
}): ReactElement {
  return <section className="panel render-failure" role="alert">
    <p className="eyebrow">Something broke on screen</p>
    <h2>This screen couldn&rsquo;t be drawn</h2>
    <p className="muted">
      Your career is safe. The simulation runs separately from the screen and it autosaves every
      week, so reloading picks up exactly where you were &mdash; you will not lose the season.
    </p>
    <div className="render-failure-actions">
      {onRetry && <button onClick={onRetry}>Go back to the dashboard</button>}
      <button onClick={() => window.location.reload()}>Reload the game</button>
    </div>
    <details>
      <summary>What went wrong ({scope})</summary>
      <pre>{error.message}</pre>
    </details>
  </section>;
}
