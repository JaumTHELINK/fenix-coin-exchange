import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Captura erros de renderização em qualquer ponto da árvore e mostra uma
 * tela de recuperação em vez de deixar a página em branco.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Erro inesperado" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: "" });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Algo deu errado</h1>
          <p className="max-w-md text-muted-foreground">
            Ocorreu um erro inesperado. Tente recarregar a página — se o problema
            persistir, avise o suporte.
          </p>
          <Button onClick={this.handleReload}>Voltar ao início</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
