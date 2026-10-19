import { BrandLogo } from "@/components/BrandLogo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Send, ArrowLeft, Leaf, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Sobre = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    });
    if (error) {
      toast({ title: "Erro", description: "Não foi possível enviar sua mensagem. Tente novamente.", variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-accent">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-36" />
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 py-20 text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Transformando reciclagem em recompensas</h1>
          <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            O Ecoteiner é um sistema inovador que incentiva a reciclagem através de Fênix Coins, uma moeda digital que você ganha ao reciclar materiais nos nossos pontos de coleta.
          </p>
        </div>
      </section>

      {/* Mission, Values */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-card p-8 shadow-card text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Leaf className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Nossa Missão</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Promover a sustentabilidade ambiental através de um sistema de incentivo à reciclagem, tornando o descarte correto acessível e recompensador.
              </p>
            </div>
            <div className="rounded-xl bg-card p-8 shadow-card text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Como Funciona</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Leve seus materiais recicláveis a um ponto de coleta parceiro, acumule Fênix Coins e troque por produtos e benefícios na nossa loja.
              </p>
            </div>
            <div className="rounded-xl bg-card p-8 shadow-card text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Impacto</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cada quilo reciclado contribui para um futuro mais limpo. Juntos, construímos uma comunidade engajada com o meio ambiente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="border-t border-border bg-card py-16" id="contato">
        <div className="mx-auto max-w-2xl px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">Fale Conosco</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tem dúvidas, sugestões ou quer ser um ponto de coleta parceiro? Entre em contato!</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4 py-8">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/10">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Mensagem enviada!</h3>
              <p className="text-sm text-muted-foreground">Obrigado pelo contato. Responderemos o mais breve possível.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" placeholder="Seu nome" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input id="subject" placeholder="Assunto da mensagem" value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea id="message" placeholder="Escreva sua mensagem..." rows={5} value={formData.message} onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))} required />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Enviando..." : "Enviar mensagem"}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Ecoteiner. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Sobre;
