import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone, CreditCard, Lock, Recycle, Check, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { formatCPF, formatPhone, validateCPF, passwordRules } from "@/lib/validation";


const translateError = (msg: string): string => {
  if (msg.includes("User already registered")) return "Este e-mail já está cadastrado. Tente fazer login.";
  if (msg.includes("Password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("Unable to validate email")) return "Endereço de e-mail inválido.";
  if (msg.includes("Signup requires a valid password")) return "Informe uma senha válida.";
  return msg;
};



const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", cpf: "", password: "", confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState({ password: false, confirmPassword: false });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (field === "cpf") value = formatCPF(value);
    if (field === "phone") value = formatPhone(value);
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Nome é obrigatório.";
    if (!form.email.trim()) errs.email = "Email é obrigatório.";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) errs.phone = "Telefone inválido. Use (XX) XXXXX-XXXX.";
    if (!validateCPF(form.cpf)) errs.cpf = "CPF inválido.";
    if (!passwordRules.every((rule) => rule.test(form.password)))
      errs.password = "A senha não atende a todos os requisitos.";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "As senhas não coincidem.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, phone: form.phone, cpf: form.cpf },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({ title: "Erro ao criar conta", description: translateError(error.message), variant: "destructive" });
    } else {
      toast({ title: "Conta criada com sucesso!", description: "Verifique seu email para confirmar o cadastro." });
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const fields = [
    { id: "name", label: "Nome completo *", icon: User, placeholder: "Seu nome completo", type: "text" },
    { id: "email", label: "Email *", icon: Mail, placeholder: "seu@email.com", type: "email" },
    { id: "phone", label: "Telefone *", icon: Phone, placeholder: "(11) 99999-9999", type: "tel" },
    { id: "cpf", label: "CPF *", icon: CreditCard, placeholder: "000.000.000-00", type: "text" },
    { id: "password", label: "Senha *", icon: Lock, placeholder: "••••••", type: "password" },
    { id: "confirmPassword", label: "Confirmar senha *", icon: Lock, placeholder: "••••••••", type: "password" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Recycle className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ecoteiner</h1>
          <p className="text-sm text-muted-foreground">Crie sua conta</p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">Cadastro</h2>
          <p className="text-sm text-muted-foreground">Preencha os dados para criar sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ id, label, icon: Icon, placeholder, type }) => {
            const isPassword = id === "password" || id === "confirmPassword";
            const visible = isPassword ? showPassword[id as keyof typeof showPassword] : false;
            return (
              <div key={id} className="space-y-1">
                <Label htmlFor={id}>{label}</Label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={id}
                    type={isPassword ? (visible ? "text" : "password") : type}
                    placeholder={placeholder}
                    className={`pl-10 ${isPassword ? "pr-10" : ""} ${errors[id] ? "border-destructive" : ""}`}
                    value={form[id as keyof typeof form]}
                    onChange={update(id)}
                    required
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => ({ ...prev, [id]: !prev[id as keyof typeof prev] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {errors[id] && <p className="text-xs text-destructive">{errors[id]}</p>}

              {id === "password" && (
                <ul className="mt-2 space-y-1">
                  {passwordRules.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <li
                        key={rule.id}
                        className={`flex items-center gap-1.5 text-xs ${ok ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )})}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>

            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link to="/" className="font-medium text-primary hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
