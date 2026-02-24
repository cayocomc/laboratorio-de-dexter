import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

if (window.__dexterCalendarAuthInit) {
  console.warn("App de autenticação já inicializado. Ignorando nova inicialização.");
} else {
  window.__dexterCalendarAuthInit = true;

  const supabaseUrl = "https://mssbrtjfwaxfmzxcpnyc.supabase.co";
  const supabaseAnonKey = "sb_publishable_AditA8FjUDZ4C0FE6auKsQ_vDKvnrMF";

  const authArea = document.getElementById("auth-area");
  const calendarArea = document.getElementById("calendar-area");
  const confirmArea = document.getElementById("confirm-area");
  const confirmText = document.getElementById("confirm-text");
  const confirmLoginBtn = document.getElementById("confirm-login-btn");
  const loginIndicator = document.getElementById("login-indicator");
  const lista = document.getElementById("lista");
  const statusEl = document.getElementById("status");
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");

  const urlPlanilha = "https://docs.google.com/spreadsheets/d/1Kwh0QZIesB1CVOkZY8uh648mxWzvFx7AZ91ziyMQIQ0/gviz/tq?tqx=out:json";
  let hasConfirmedLogin = false;
  let currentSession = null;

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", isError);
    statusEl.classList.toggle("success", !isError && Boolean(message));
  }

  function updateLoginIndicator(session) {
    if (!session) {
      loginIndicator.textContent = "🔒 Não autenticado";
      return;
    }

    if (!hasConfirmedLogin) {
      loginIndicator.textContent = `🟡 Login com sucesso para ${session.user.email}. Falta confirmar entrada.`;
      return;
    }

    loginIndicator.textContent = `✅ Login com sucesso e acesso liberado para ${session.user.email}.`;
  }

  function toggleArea(session) {
    const logged = Boolean(session);
    authArea.classList.toggle("hidden", logged);
    confirmArea.classList.toggle("hidden", !logged || hasConfirmedLogin);
    calendarArea.classList.toggle("hidden", !logged || !hasConfirmedLogin);

    if (logged && !hasConfirmedLogin) {
      confirmText.textContent = `Login detectado para ${session.user.email}. Clique em confirmar para abrir o calendário.`;
    }

    updateLoginIndicator(session);
  }

  async function carregarCalendario() {
    lista.innerHTML = "";
    const res = await fetch(urlPlanilha);
    const data = await res.text();
    const json = JSON.parse(data.substring(47).slice(0, -2));
    const rows = json.table.rows;

    rows.forEach((row) => {
      const dataEvento = row.c[0]?.v || "";
      const evento = row.c[1]?.v || "";
      const descricao = row.c[2]?.v || "";
      const li = document.createElement("li");
      li.textContent = `${dataEvento} - ${evento}: ${descricao}`;
      lista.appendChild(li);
    });
  }

  async function init() {
    if (supabaseUrl.includes("SEU-PROJETO") || supabaseAnonKey.includes("SUA-CHAVE")) {
      setStatus("Configure SUPABASE_URL e SUPABASE_ANON_KEY no index.html.", true);
      toggleArea(null);
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("Criando conta...");
      const email = document.getElementById("signup-email").value.trim();
      const password = document.getElementById("signup-password").value;
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setStatus(error.message, true);
        return;
      }
      setStatus("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      signupForm.reset();
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("Entrando...");
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus(error.message, true);
        return;
      }
      setStatus("Login com sucesso. Agora confirme a entrada para abrir o calendário.");
      loginForm.reset();
    });

    confirmLoginBtn.addEventListener("click", async () => {
      if (!currentSession) {
        setStatus("Sessão inválida. Faça login novamente.", true);
        return;
      }

      hasConfirmedLogin = true;
      toggleArea(currentSession);

      try {
        await carregarCalendario();
        setStatus("✅ Login confirmado com sucesso.");
      } catch (error) {
        setStatus(`Falha ao carregar eventos: ${error.message}`, true);
      }
    });

    logoutBtn.addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setStatus(error.message, true);
        return;
      }
      hasConfirmedLogin = false;
      currentSession = null;
      toggleArea(null);
      setStatus("Você saiu da conta.");
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        currentSession = null;
        hasConfirmedLogin = false;
        toggleArea(null);
        return;
      }

      currentSession = session;
      if (event === "SIGNED_IN") {
        hasConfirmedLogin = false;
        setStatus("Login com sucesso. Confirme a entrada para continuar.");
      }

      toggleArea(currentSession);
    });

    const { data: { session } } = await supabase.auth.getSession();
    currentSession = session;
    hasConfirmedLogin = false;
    toggleArea(currentSession);
  }

  init().catch((error) => {
    setStatus(`Erro ao iniciar aplicação: ${error.message}`, true);
  });
}
