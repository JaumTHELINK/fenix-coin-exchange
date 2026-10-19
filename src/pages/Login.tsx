import { BrandLogo } from "@/components/BrandLogo";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, cpfToLoginEmail } from "@/lib/validation";


const translateError = (msg: string): string => {
  if (msg.includes("Invalid login credentials")) return "CPF ou senha incorretos.";
  if (msg.includes("Email not confirmed")) return "Confirme seu email antes de entrar. Verifique sua caixa de entrada.";
  if (msg.includes("Too many requests")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (msg.includes("User not found")) return "Usuário não encontrado.";
  if (msg.includes("account is disabled") || msg.includes("banned")) return "Sua conta foi desativada. Entre em contato com o administrador.";
  return msg;
};

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email: login.includes("@") ? login.trim() : cpfToLoginEmail(login), password });

    if (error) {
      toast({ title: "Erro ao entrar", description: translateError(error.message), variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check if user is active
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("user_id", data.user.id)
        .single();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        toast({ title: "Conta desativada", description: "Sua conta foi desativada pelo administrador. Entre em contato para mais informações.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Lojistas go to their store panel
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const isLojista = (roles ?? []).some((r) => r.role === "lojista");
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (isLojista && !isAdmin) {
        navigate("/minha-loja");
        setLoading(false);
        return;
      }
    }

    navigate("/dashboard");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2">
          <h1><BrandLogo /></h1>
          <p className="text-sm text-muted-foreground">Sistema de Reciclagem</p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">Entrar na sua conta</h2>
          <p className="text-sm text-muted-foreground">Digite suas credenciais para acessar o sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">CPF</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="login" inputMode="numeric" placeholder="000.000.000-00" className="pl-10" value={login} onChange={(e) => setLogin(e.target.value.includes("@") ? e.target.value : formatCPF(e.target.value))} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>


          <div className="flex justify-end">
            <Link to="/recuperar-senha" className="text-xs text-primary hover:underline">Esqueceu sua senha?</Link>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          <p>
            Não tem uma conta?{" "}
            <Link to="/cadastro" className="font-medium text-primary hover:underline">Cadastre-se</Link>
          </p>
          <p>
            <Link to="/sobre" className="font-medium text-primary hover:underline">Sobre o Ecoteiner</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
