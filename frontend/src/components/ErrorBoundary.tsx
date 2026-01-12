import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught error:', error)
    console.error('Error info:', errorInfo)
    console.error('Component stack:', errorInfo.componentStack)
    
    // Update state with error info for display
    this.setState({
      error,
      errorInfo,
    })

    // You could also log to an error reporting service here
    // Example: logErrorToService(error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state
      
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          padding: '20px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '600px',
            width: '100%',
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#dc2626',
              marginBottom: '16px'
            }}>
              ⚠️ Something went wrong
            </h1>
            <p style={{
              color: '#6b7280',
              marginBottom: '8px',
              fontSize: '16px'
            }}>
              {error?.message || 'An unexpected error occurred'}
            </p>
            {errorInfo && process.env.NODE_ENV === 'development' && (
              <details style={{
                marginTop: '16px',
                textAlign: 'left',
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '12px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0
                }}>
                  {error?.stack}
                  {'\n\n'}
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div style={{ marginTop: '24px' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null })
                  window.location.reload()
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ED2B2A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginRight: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#DC2626'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ED2B2A'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null })
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
