import { useMemo, useState } from "react";
import type { LoginCredentials, RegisterCredentials, RegisterResponse } from "../types";

interface LoginScreenProps {
  errorMessage?: string;
  isSubmitting: boolean;
  notice?: {
    description: string;
    title: string;
  } | null;
  onLogin: (credentials: LoginCredentials) => Promise<void> | void;
  onRegister: (credentials: RegisterCredentials) => Promise<RegisterResponse | void> | RegisterResponse | void;
}

type AuthMode = "login" | "register";

interface RegisterFormState extends RegisterCredentials {
  confirmPassword: string;
}

const showcaseViews = [
  {
    id: "agenda",
    label: "Fila de atendimento",
    eyebrow: "Atendimento do dia",
    title: "Fila organizada com 3 horarios visiveis para a rotina.",
    description: "Acompanhe os 3 horarios do dia, confirme atendimentos e execute acoes rapidas sem sair do painel principal.",
    stats: [
      { value: "03", label: "horarios" },
      { value: "02", label: "confirmados" }
    ],
    bullets: ["3 horarios organizados", "Confirmacao em um clique", "Reenvio de lembretes"]
  },
  {
    id: "caixa",
    label: "Pagamentos pendentes",
    eyebrow: "Controle financeiro",
    title: "Visualize pagamentos pendentes com acoes discretas.",
    description: "A area de caixa permite acompanhar valores em aberto, filtrar metodos e abrir o ajuste de status apenas quando necessario.",
    stats: [
      { value: "R$ 115", label: "pendente" },
      { value: "02", label: "cobrancas" }
    ],
    bullets: ["Pagas e nao pagas separadas", "Filtros por metodo", "Acoes recolhidas e discretas"]
  },
  {
    id: "clientes",
    label: "Clientes",
    eyebrow: "Relacao com o tutor",
    title: "Pets, tutores e servicos em uma visao limpa.",
    description: "Consulte rapidamente quem esta no dia, quais servicos estao ativos e como a operacao esta distribuida.",
    stats: [
      { value: "04", label: "pets ativos" },
      { value: "09", label: "servicos" }
    ],
    bullets: ["Cards alinhados no mobile", "Leitura rapida por pet", "Visao geral mais clara"]
  }
] as const;

function getPasswordChecks(password: string) {
  return [
    { id: "length", label: "10+ caracteres", valid: password.length >= 10 },
    { id: "lowercase", label: "1 letra minuscula", valid: /[a-z]/.test(password) },
    { id: "uppercase", label: "1 letra maiuscula", valid: /[A-Z]/.test(password) },
    { id: "number", label: "1 numero", valid: /[0-9]/.test(password) },
    { id: "special", label: "1 simbolo especial", valid: /[^A-Za-z0-9]/.test(password) },
    { id: "spaces", label: "Sem espacos no inicio ou fim", valid: password.length > 0 && password.trim() === password }
  ];
}

export function LoginScreen({ errorMessage, isSubmitting, notice, onLogin, onRegister }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials>({
    email: "",
    password: ""
  });
  const [registerCredentials, setRegisterCredentials] = useState<RegisterFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [activeShowcaseId, setActiveShowcaseId] = useState<(typeof showcaseViews)[number]["id"]>("agenda");
  const [localError, setLocalError] = useState("");
  const [submittedMode, setSubmittedMode] = useState<AuthMode | null>(null);

  const activeShowcase = showcaseViews.find((item) => item.id === activeShowcaseId) ?? showcaseViews[0];
  const passwordChecks = useMemo(() => getPasswordChecks(registerCredentials.password), [registerCredentials.password]);
  const displayError = localError || (submittedMode === mode ? errorMessage ?? "" : "");

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setLocalError("");
    setSubmittedMode(null);
  }

  function updateLoginField(field: keyof LoginCredentials, value: string) {
    setLocalError("");
    setSubmittedMode(null);
    setLoginCredentials((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateRegisterField(field: keyof RegisterFormState, value: string) {
    setLocalError("");
    setSubmittedMode(null);
    setRegisterCredentials((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "login") {
      setSubmittedMode("login");
      await onLogin({
        email: loginCredentials.email.trim(),
        password: loginCredentials.password
      });
      return;
    }

    const normalizedName = registerCredentials.name.trim().replace(/\s+/g, " ");
    const normalizedEmail = registerCredentials.email.trim().toLowerCase();

    if (registerCredentials.password !== registerCredentials.confirmPassword) {
      setSubmittedMode("register");
      setLocalError("A confirmacao da senha precisa ser igual a senha cadastrada.");
      return;
    }

    if (!passwordChecks.every((check) => check.valid)) {
      setSubmittedMode("register");
      setLocalError("A senha precisa atender todos os requisitos de seguranca.");
      return;
    }

    setSubmittedMode("register");
    const result = await onRegister({
      name: normalizedName,
      email: normalizedEmail,
      password: registerCredentials.password
    });

    if (!result) {
      return;
    }

    setLoginCredentials({
      email: result.email,
      password: ""
    });
    setRegisterCredentials((current) => ({
      ...current,
      password: "",
      confirmPassword: ""
    }));
    setLocalError("");
    setSubmittedMode(null);
    setMode("login");
  }

  return (
    <section className="login-layout">
      <article className="login-showcase">
        <div className="hero-brand-mark">PetFlow : Plataforma Inteligente para Gestão de Petshop</div>
        <div className="login-showcase__eyebrow">Acesso protegido</div>
        <h1 className="login-showcase__title">Entre no painel operacional do pet shop.</h1>
        <p className="login-showcase__text">
          Faça login para acompanhar agenda, caixa, atendimento do dia e controle dos Serviços em uma única área protegida.
        </p>

        <div className="login-showcase__switcher" role="tablist" aria-label="Areas do painel">
          {showcaseViews.map((view) => (
            <button
              aria-pressed={activeShowcaseId === view.id}
              className={`login-showcase__switch${activeShowcaseId === view.id ? " login-showcase__switch--active" : ""}`}
              key={view.id}
              onClick={() => setActiveShowcaseId(view.id)}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="login-preview-panel">
          <div className="login-preview-panel__header">
            <span>{activeShowcase.eyebrow}</span>
            <strong>{activeShowcase.title}</strong>
            <p>{activeShowcase.description}</p>
          </div>

          <div className="login-preview-panel__stats">
            {activeShowcase.stats.map((stat) => (
              <div className="login-preview-panel__stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="login-preview-panel__list">
            {activeShowcase.bullets.map((bullet) => (
              <div className="login-preview-panel__list-item" key={bullet}>
                <span className="login-preview-panel__dot" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="login-showcase__cards">
          <div className="login-showcase__card">
            <span>Fila de atendimento</span>
            <strong>3 horarios organizados com ações rápidas</strong>
          </div>
          <div className="login-showcase__card">
            <span>Pagamentos pendentes</span>
            <strong>Cobranças em aberto com filtros e ajuste de status</strong>
          </div>
        </div>
      </article>

      <article className="login-card">
        {notice ? (
          <div className="login-card__notice" role="status">
            <strong>{notice.title}</strong>
            <span>{notice.description}</span>
          </div>
        ) : null}

        <div className="login-card__header">
          <div className="eyebrow">Seguranca de acesso</div>
          <h2 className="login-card__title">{mode === "login" ? "Entre com sua conta" : "Crie sua conta administrativa"}</h2>
          <p className="login-card__text">
            {mode === "login"
              ? "Entre com o email e a senha cadastrados para acessar o painel."
              : "Cadastre o primeiro acesso do painel com senha forte para liberar o login do sistema."}
          </p>
        </div>

        <div className="login-card__mode-switch" role="tablist" aria-label="Modo de autenticacao">
          <button
            aria-selected={mode === "login"}
            className={`login-card__mode-button${mode === "login" ? " login-card__mode-button--active" : ""}`}
            onClick={() => switchMode("login")}
            type="button"
          >
            Entrar
          </button>
          <button
            aria-selected={mode === "register"}
            className={`login-card__mode-button${mode === "register" ? " login-card__mode-button--active" : ""}`}
            onClick={() => switchMode("register")}
            type="button"
          >
            Cadastrar
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label className="login-form__field" htmlFor="register-name">
                <span>Nome completo</span>
                <input
                  autoComplete="name"
                  className="login-form__control"
                  id="register-name"
                  onChange={(event) => updateRegisterField("name", event.target.value)}
                  placeholder="Ex.: Equipe administrativa"
                  type="text"
                  value={registerCredentials.name}
                />
              </label>

              <label className="login-form__field" htmlFor="register-email">
                <span>Email</span>
                <input
                  autoComplete="email"
                  className="login-form__control"
                  id="register-email"
                  onChange={(event) => updateRegisterField("email", event.target.value)}
                  placeholder="Ex.: acesso@clinicadospets.com.br"
                  type="email"
                  value={registerCredentials.email}
                />
              </label>

              <label className="login-form__field" htmlFor="register-password">
                <span>Senha forte</span>
                <input
                  autoComplete="new-password"
                  className="login-form__control"
                  id="register-password"
                  onChange={(event) => updateRegisterField("password", event.target.value)}
                  placeholder="Ex.: MeuPet@2026!"
                  type="password"
                  value={registerCredentials.password}
                />
              </label>

              <div className="login-password-rules" aria-live="polite">
                {passwordChecks.map((check) => (
                  <div className={`login-password-rule${check.valid ? " login-password-rule--ok" : ""}`} key={check.id}>
                    {check.label}
                  </div>
                ))}
              </div>

              <label className="login-form__field" htmlFor="register-confirm-password">
                <span>Confirmar senha</span>
                <input
                  autoComplete="new-password"
                  className="login-form__control"
                  id="register-confirm-password"
                  onChange={(event) => updateRegisterField("confirmPassword", event.target.value)}
                  placeholder="Repita a senha criada"
                  type="password"
                  value={registerCredentials.confirmPassword}
                />
              </label>

              <div className="login-card__security">
                <div className="login-card__security-item">Sua senha fica protegida no sistema.</div>
                <div className="login-card__security-item">Cada email pode ser usado em apenas uma conta.</div>
                <div className="login-card__security-item">Depois de cadastrar, e so entrar com seu email e senha.</div>
              </div>
            </>
          ) : (
            <>
              <label className="login-form__field" htmlFor="login-email">
                <span>Email</span>
                <input
                  autoComplete="email"
                  className="login-form__control"
                  id="login-email"
                  onChange={(event) => updateLoginField("email", event.target.value)}
                  placeholder="Ex.: acesso@clinicadospets.com.br"
                  type="email"
                  value={loginCredentials.email}
                />
              </label>

              <label className="login-form__field" htmlFor="login-password">
                <span>Senha</span>
                <input
                  autoComplete="current-password"
                  className="login-form__control"
                  id="login-password"
                  onChange={(event) => updateLoginField("password", event.target.value)}
                  placeholder="Digite sua senha"
                  type="password"
                  value={loginCredentials.password}
                />
              </label>

              <div className="login-card__hint">Use a aba Cadastrar para criar seu acesso.</div>
            </>
          )}

          {displayError ? <div className="login-form__error">{displayError}</div> : null}

          <button className="login-form__submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? (mode === "login" ? "Entrando..." : "Cadastrando...") : mode === "login" ? "Entrar no painel" : "Criar conta segura"}
          </button>
        </form>
      </article>
    </section>
  );
}