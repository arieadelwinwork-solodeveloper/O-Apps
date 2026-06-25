import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
          <div className="max-w-md bg-white rounded-[20px] p-6 shadow-sm border border-red-100">
            <h1 className="text-lg font-semibold text-red-700 mb-2">
              Terjadi kesalahan
            </h1>
            <p className="text-sm text-slate-600 mb-4">
              Muat ulang halaman. Jika masih bermasalah, cek konsol browser (F12).
            </p>
            <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto text-slate-500">
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
