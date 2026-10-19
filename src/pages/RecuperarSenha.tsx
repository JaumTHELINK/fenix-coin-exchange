import { BrandLogo } from "@/components/BrandLogo";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldQuestion } from "lucide-react";

const RecuperarSenha = () => (
  <div className="flex min-h-screen items-center justify-center bg-accent p-4">
    <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-card">
      <div className="mb-6 flex flex-col items-center gap-2">
        <h1><BrandLogo /></h1>
      </div>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <ShieldQuestion className="h-8 w-8 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Esqueceu sua senha?</h2>
        <p className="text-sm text-muted-foreground">
          Procure um administrador do Ecoteiner informando seu nome e CPF. Ele vai criar uma nova senha para você.
        </p>
      </div>
      <Link to="/" className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Link>
    </div>
  </div>
);

export default RecuperarSenha;
