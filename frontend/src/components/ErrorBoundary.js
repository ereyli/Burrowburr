import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // State'i güncelle ki bir sonraki render'da fallback UI gösterilsin
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Wallet ile ilgili hataları özel olarak handle et
    if (error.message && (
      error.message.includes('KeyRing is locked') ||
      error.message.includes('chrome-extension') ||
      error.message.includes('injectedScript') ||
      error.message.includes('wallet')
    )) {
      console.log('Wallet locked or extension error caught and suppressed:', error.message);
      // Bu tür hataları sessizce handle et - UI'da hiçbir şey gösterme
      this.setState({ hasError: false, error: null });
      return;
    }

    // Diğer critical hataları log'la
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps, prevState) {
    // Eğer error state temizlendiyse, component'i reset et
    if (prevState.hasError && !this.state.hasError) {
      this.forceUpdate();
    }
  }

  render() {
    // Wallet hataları için özel UI gösterme
    if (this.state.hasError && this.state.error) {
      const errorMessage = this.state.error.message || '';
      
      if (errorMessage.includes('KeyRing is locked') || 
          errorMessage.includes('wallet') ||
          errorMessage.includes('chrome-extension')) {
        // Wallet hataları için kullanıcı dostu mesaj
        return (
          <div style={{
            padding: '20px',
            margin: '20px',
            backgroundColor: '#2a1810',
            border: '2px solid #ff6b35',
            borderRadius: '10px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>
              <img src="/beaver_logo.png" alt="Beaver" style={{ width: '40px', height: '40px' }} />
            </div>
            <h3 style={{ color: '#ff6b35', marginBottom: '10px' }}>Wallet Connection Issue</h3>
            <p style={{ marginBottom: '15px' }}>
              Please unlock your wallet and refresh the page to continue mining!
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#ff6b35',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Refresh Page
            </button>
          </div>
        );
      }
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 