import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return jsonResponse({ error: "Não autenticado." }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Sessão inválida." }, 401);
    }

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return jsonResponse({ error: "Apenas administradores podem editar usuários." }, 403);
    }

    const body = await req.json();
    const { user_id, email, password } = body as {
      user_id?: string;
      email?: string;
      password?: string;
    };

    if (!user_id) {
      return jsonResponse({ error: "Usuário não informado." }, 400);
    }

    const updates: { email?: string; password?: string; email_confirm?: boolean } = {};

    if (typeof email === "string" && email.trim()) {
      const trimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return jsonResponse({ error: "Email inválido." }, 400);
      }
      updates.email = trimmed;
      updates.email_confirm = true;
    }

    if (typeof password === "string" && password) {
      if (password.length < 6) {
        return jsonResponse({ error: "A senha deve ter pelo menos 6 caracteres." }, 400);
      }
      updates.password = password;
    }

    if (!updates.email && !updates.password) {
      return jsonResponse({ error: "Nada para atualizar." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: updateErr } = await admin.auth.admin.updateUserById(user_id, updates);
    if (updateErr) {
      return jsonResponse({ error: updateErr.message }, 400);
    }

    if (updates.email) {
      await admin.from("profiles").update({ email: updates.email }).eq("user_id", user_id);
    }

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
