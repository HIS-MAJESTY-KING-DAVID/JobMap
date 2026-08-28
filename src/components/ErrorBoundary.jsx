import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('JobMap render failure', { error, componentStack: info.componentStack });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="app-error" role="alert">
        <p className="results-kicker">JobMap recovery mode</p>
        <h1>That screen could not load.</h1>
        <p>Your saved local data is still on this device. Reload JobMap to recover the application shell, or return later if the feed is temporarily unavailable.</p>
        <button className="primary-action" type="button" onClick={this.handleReload}>Reload JobMap</button>
      </main>
    );
  }
}
