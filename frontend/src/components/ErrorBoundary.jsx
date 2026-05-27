import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Erro capturado na interface:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-red-100 p-2 text-red-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900">Nao foi possivel carregar esta tela</h1>
              <p className="mt-2 text-sm text-slate-600">
                O sistema encontrou uma falha ao abrir esta pagina. Recarregue a tela e tente novamente.
              </p>
              {this.state.error?.message && (
                <p className="mt-3 rounded bg-slate-100 px-3 py-2 text-xs text-slate-600 break-words">
                  {this.state.error.message}
                </p>
              )}
              <button
                type="button"
                onClick={this.handleReload}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
