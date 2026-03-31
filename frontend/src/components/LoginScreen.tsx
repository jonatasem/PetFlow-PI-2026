import { useState } from "react";
import type { LoginCredentials } from "../types";

interface LoginScreenProps {
  errorMessage?: string;
  isSubmitting: boolean;
  notice?: {
    description: string;
    title: string;
  } | null;
  onSubmit: (credentials: LoginCredentials) => Promise<void> | void;
}

const demoCredentials: LoginCredentials = {
  email: "admin@brisapet.com",
  password: "petshop123"
};

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

export function LoginScreen({ errorMessage, isSubmitting, notice, onSubmit }: LoginScreenProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: ""
  });
  const [activeShowcaseId, setActiveShowcaseId] = useState<(typeof showcaseViews)[number]["id"]>("agenda");

  const activeShowcase = showcaseViews.find((item) => item.id === activeShowcaseId) ?? showcaseViews[0];

  function updateField(field: keyof LoginCredentials, value: string) {
    setCredentials((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      email: credentials.email.trim(),
      password: credentials.password
    });
  }

  return (
    <section className="login-layout">
      <article className="login-showcase">
        <div className="hero-brand-mark">Brisa Pet Boutique</div>
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
          <div className="eyebrow">Login</div>
          <h2 className="login-card__title">Acesso ao painel</h2>
          <p className="login-card__text">Use as credenciais configuradas no backend ou preencha o acesso demo abaixo.</p>
        </div>

        <button className="login-demo-button" onClick={() => setCredentials(demoCredentials)} type="button">
          Usar acesso demo
        </button>

        <div className="login-demo-credentials">
          <span>Email: admin@brisapet.com</span>
          <span>Senha: petshop123</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-form__field" htmlFor="login-email">
            <span>Email</span>
            <input
              autoComplete="email"
              className="login-form__control"
              id="login-email"
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="admin@brisapet.com"
              type="email"
              value={credentials.email}
            />
          </label>

          <label className="login-form__field" htmlFor="login-password">
            <span>Senha</span>
            <input
              autoComplete="current-password"
              className="login-form__control"
              id="login-password"
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Digite sua senha"
              type="password"
              value={credentials.password}
            />
          </label>

          {errorMessage ? <div className="login-form__error">{errorMessage}</div> : null}

          <button className="login-form__submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Entrando..." : "Entrar no painel"}
          </button>
        </form>
      </article>
    </section>
  );
}