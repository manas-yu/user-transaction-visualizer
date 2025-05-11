import React from 'react';

/**
 * ErrorBoundary component to catch errors in the component tree
 * and display a fallback UI instead of crashing the whole application
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console
        console.error("Component Error:", error);
        console.error("Error Stack:", errorInfo.componentStack);

        // Update state with error info
        this.setState({ errorInfo });

        // You can also log the error to an error reporting service here
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="error-boundary-container">
                    <h2>Something went wrong with the graph visualization.</h2>
                    <p>Please try refreshing the page or contact support if the problem persists.</p>
                    <button onClick={() => window.location.reload()}>
                        Refresh Page
                    </button>
                    {/* Only show technical details in development */}
                    {(
                        <details className="error-details">
                            <summary>Technical Error Details</summary>
                            <pre>{this.state.error && this.state.error.toString()}</pre>
                            <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                        </details>
                    )}
                </div>
            );
        }

        // If there's no error, render children normally
        return this.props.children;
    }
}

export default ErrorBoundary;