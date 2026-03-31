import { useEffect, useState } from "react";
import { ApiError, createAppointment, deleteAppointment, getAppointments, getCharges, getCustomers, getDashboard, getPets, getServices, login, removeAppointmentFromQueue, restoreAppointmentToQueue, sendReminder, updateAppointmentStatus, updateChargePaymentMethod, updateChargePaymentStatus, type CreateAppointmentPayload } from "./api/client";
import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession } from "./auth/session";
import { LoginScreen } from "./components/LoginScreen";
import { AppointmentTable } from "./components/AppointmentTable";
import { MetricCard } from "./components/MetricCard";
import { QuickBookingForm } from "./components/QuickBookingForm";
import type { Appointment, AuthSession, Charge, Customer, DashboardData, LoginCredentials, Pet, ServiceItem } from "./types";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

const emptyDashboard: DashboardData = {
  metrics: {
    clients: 0,
    pets: 0,
    services: 0,
    todayAppointments: 0,
    confirmedAppointments: 0,
    pendingReceivables: 0,
    monthlyRevenue: 0
  },
  todayAppointments: [],
  pendingCharges: []
};

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState<{ description: string; title: string } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allCharges, setAllCharges] = useState<Charge[]>([]);
  const [feedback, setFeedback] = useState("Sistema pronto para organizar agenda, cobrancas e lembretes.");
  const [isLoading, setIsLoading] = useState(true);
  const [activeShortcut, setActiveShortcut] = useState("agenda-section");
  const [showPaidCharges, setShowPaidCharges] = useState(false);
  const [chargeMethodFilter, setChargeMethodFilter] = useState<"todos" | Charge["method"]>("todos");
  const [chargeSort, setChargeSort] = useState<"value-desc" | "value-asc" | "time-asc" | "time-desc" | "method">("time-asc");
  const [expandedChargeActionId, setExpandedChargeActionId] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);

    try {
      const [dashboardData, appointmentData, chargeData, customerData, petData, serviceData] = await Promise.all([
        getDashboard(),
        getAppointments(),
        getCharges(),
        getCustomers(),
        getPets(),
        getServices()
      ]);

      setDashboard(dashboardData);
      setAllAppointments(appointmentData);
      setAllCharges(chargeData);
      setCustomers(customerData);
      setPets(petData);
      setServices(serviceData);
    } finally {
      setIsLoading(false);
    }
  }

  function resetDashboardState() {
    setDashboard(emptyDashboard);
    setCustomers([]);
    setPets([]);
    setServices([]);
    setAllAppointments([]);
    setAllCharges([]);
    setShowPaidCharges(false);
    setChargeMethodFilter("todos");
    setChargeSort("time-asc");
    setExpandedChargeActionId(null);
    setActiveShortcut("agenda-section");
  }

  function handleUnauthorized(message: string) {
    setAuthSession(null);
    resetDashboardState();
    clearStoredAuthSession();
    setIsLoading(false);
    setAuthNotice({
      title: message.includes("Acesso negado") ? "Acesso negado" : "Sessao expirada",
      description: message
    });
  }

  function handleApiFailure(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      handleUnauthorized(error.message);
      return;
    }

    setFeedback(fallbackMessage);
  }

  useEffect(() => {
    if (!authSession) {
      setIsLoading(false);
      return;
    }

    loadData().catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized(error.message);
        return;
      }

      setFeedback("Nao foi possivel carregar a API. Verifique se o backend esta em execucao.");
      setIsLoading(false);
    });
  }, [authSession]);

  async function handleLogin(credentials: LoginCredentials) {
    setIsAuthenticating(true);
    setAuthError("");
    setAuthNotice(null);

    try {
      const session = await login(credentials);
      setAuthSession(session);
      setStoredAuthSession(session);
      setFeedback(`Login realizado com sucesso. Bem-vindo, ${session.name}.`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Nao foi possivel realizar o login.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    setAuthSession(null);
    setAuthError("");
    setAuthNotice(null);
    resetDashboardState();
    setFeedback("Sessao encerrada.");
    clearStoredAuthSession();
  }

  async function handleCreateAppointment(payload: CreateAppointmentPayload) {
    try {
      await createAppointment({
        ...payload,
        startsAt: new Date(payload.startsAt).toISOString()
      });

      setFeedback("Agendamento salvo com sucesso.");
      await loadData();
    } catch (error) {
      handleApiFailure(error, "Nao foi possivel salvar o agendamento. Tente novamente.");
    }
  }

  async function handleSendReminder(appointmentId: string) {
    try {
      const result = await sendReminder(appointmentId);
      setFeedback(result.mode === "live" ? "Lembrete enviado pelo WhatsApp." : "Lembrete gerado em modo de simulacao.");
      await loadData();
    } catch (error) {
      handleApiFailure(error, "Falha ao enviar lembrete. Verifique a API e tente novamente.");
    }
  }

  async function handleUpdateAppointmentStatus(appointmentId: string, status: "confirmado" | "pendente" | "concluido" | "cancelado") {
    try {
      await updateAppointmentStatus(appointmentId, status);
      setFeedback(`Agendamento atualizado para ${status}.`);
      await loadData();
    } catch (error) {
      handleApiFailure(error, "Nao foi possivel atualizar o status do agendamento.");
    }
  }

  async function handleDeleteAppointment(appointmentId: string) {
    try {
      await removeAppointmentFromQueue(appointmentId);
      setFeedback("Atendimento excluido da fila com sucesso.");
      await loadData();
    } catch (error) {
      handleApiFailure(error, "Nao foi possivel excluir o atendimento da fila.");
    }
  }

  async function handleRestoreAppointment(appointmentId: string) {
    try {
      await restoreAppointmentToQueue(appointmentId);
      setFeedback("Atendimento recolocado na fila.");
      await loadData();
    } catch (error) {
      handleApiFailure(error, "Nao foi possivel recolocar o atendimento na fila.");
    }
  }

  async function handleDeleteHiddenAppointment(appointmentId: string) {
    try {
      await deleteAppointment(appointmentId);
      setFeedback("Atendimento excluido definitivamente.");
      await loadData();
    } catch (error) {
      handleApiFailure(error, "Nao foi possivel excluir definitivamente o atendimento.");
    }
  }

  async function handleUpdateChargePayment(chargeId: string, paid: boolean) {
    const currentCharge = allCharges.find((charge) => charge.id === chargeId);

    if (currentCharge?.paid === paid) {
      setFeedback(paid ? "Esta cobranca ja esta marcada como paga." : "Esta cobranca ja esta marcada como nao paga.");
      return;
    }

    try {
      await updateChargePaymentStatus(chargeId, paid);
      setFeedback(paid ? "Pagamento marcado como pago." : "Pagamento marcado como nao pago.");
      setExpandedChargeActionId(null);
      await loadData();
    } catch (error) {
      handleApiFailure(error, "Nao foi possivel atualizar o pagamento.");
    }
  }

  async function handleUpdateChargeMethod(chargeId: string, method: Charge["method"]) {
    try {
      await updateChargePaymentMethod(chargeId, method);
      setFeedback(`Metodo de pagamento atualizado para ${method}.`);
      await loadData();
    } catch (error) {
      handleApiFailure(error, "Nao foi possivel atualizar o metodo de pagamento.");
    }
  }

  const confirmedRate = dashboard.metrics.todayAppointments
    ? Math.round((dashboard.metrics.confirmedAppointments / dashboard.metrics.todayAppointments) * 100)
    : 0;
  const caninePets = pets.filter((pet) => pet.species.toLowerCase().includes("can")).length;
  const felinePets = pets.filter((pet) => pet.species.toLowerCase().includes("fel")).length;
  const featuredPets = pets.slice(0, 3);
  const getChargePetName = (charge: Charge) => {
    if (charge.appointment?.pet?.name) {
      return charge.appointment.pet.name;
    }

    const matchedPet = pets.find((pet) => pet.id === charge.appointment?.petId);
    return matchedPet?.name ?? "Pet sem identificacao";
  };
  const activeBase = `${dashboard.metrics.clients} clientes | ${pets.length} pets`;
  const petMix = `${caninePets} caninos | ${felinePets} felinos`;
  const hiddenTodayAppointments = allAppointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.startsAt);
    return appointment.hiddenFromQueue && appointmentDate.toISOString().slice(0, 10) === "2026-03-28";
  });
  const financeCharges = allCharges.map((charge) => ({
    ...charge,
    appointment: charge.appointment ?? allAppointments.find((appointment) => appointment.id === charge.appointmentId)
  }));
  const paidChargeCount = financeCharges.filter((charge) => charge.paid).length;
  const pendingChargeCount = financeCharges.filter((charge) => !charge.paid).length;
  const paidChargeTotal = financeCharges.filter((charge) => charge.paid).reduce((sum, charge) => sum + charge.amount, 0);
  const pendingChargeTotal = financeCharges.filter((charge) => !charge.paid).reduce((sum, charge) => sum + charge.amount, 0);
  const methodCounts = {
    todos: financeCharges.length,
    pix: financeCharges.filter((charge) => charge.method === "pix").length,
    cartao: financeCharges.filter((charge) => charge.method === "cartao").length,
    dinheiro: financeCharges.filter((charge) => charge.method === "dinheiro").length
  };
  const visibleFinanceCharges = financeCharges.filter((charge) => {
    const matchesStatus = showPaidCharges || !charge.paid;
    const matchesMethod = chargeMethodFilter === "todos" || charge.method === chargeMethodFilter;
    return matchesStatus && matchesMethod;
  }).sort((left, right) => {
    if (chargeSort === "value-desc") {
      return right.amount - left.amount;
    }

    if (chargeSort === "value-asc") {
      return left.amount - right.amount;
    }

    if (chargeSort === "time-desc") {
      const leftTime = left.appointment ? new Date(left.appointment.startsAt).getTime() : 0;
      const rightTime = right.appointment ? new Date(right.appointment.startsAt).getTime() : 0;
      return rightTime - leftTime;
    }

    if (chargeSort === "method") {
      return left.method.localeCompare(right.method, "pt-BR");
    }

    const leftTime = left.appointment ? new Date(left.appointment.startsAt).getTime() : 0;
    const rightTime = right.appointment ? new Date(right.appointment.startsAt).getTime() : 0;
    return leftTime - rightTime;
  });

  function scrollToSection(sectionId: string) {
    setActiveShortcut(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!authSession) {
    return (
      <div className="app-shell">
        <div className="app-shell__inner app-shell__inner--auth">
          <LoginScreen errorMessage={authError} isSubmitting={isAuthenticating} notice={authNotice} onSubmit={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell__inner">
        <section className="session-strip">
          <div>
            <span className="session-strip__label">Sessao ativa</span>
            <strong>{authSession.name}</strong>
            <span>{authSession.email}</span>
          </div>
          <button className="session-strip__button" onClick={handleLogout} type="button">
            Sair do painel
          </button>
        </section>

        <section className="hero-panel">
          <div className="hero-panel__copy">
            <div className="hero-brand-lockup">
              <div className="hero-brand-mark">Brisa Pet Boutique</div>
              <div className="hero-brand-note">Atendimento premium para rotina, agenda e caixa do pet shop</div>
            </div>
            <h1 className="hero-panel__title">
              <span className="hero-panel__title-brand">Brisa Pet Boutique</span>
              <span className="hero-panel__title-accent"> mais bonita, destacada e profissional para a operacao do dia.</span>
            </h1>
            <p className="hero-panel__text">
              Centralize agenda, atendimento e acompanhamento financeiro em uma experiencia visual mais discreta, executiva e preparada para a rotina do pet shop.
            </p>
            <div className="hero-panel__chips">
              <button className={`hero-chip hero-chip--button${activeShortcut === "booking-section" ? " hero-chip--active" : ""}`} onClick={() => scrollToSection("booking-section")} type="button">
                Gestao da agenda
              </button>
              <button className={`hero-chip hero-chip--button${activeShortcut === "agenda-section" ? " hero-chip--active" : ""}`} onClick={() => scrollToSection("agenda-section")} type="button">
                Atendimento do dia
              </button>
              <button className={`hero-chip hero-chip--button${activeShortcut === "metrics-section" ? " hero-chip--active" : ""}`} onClick={() => scrollToSection("metrics-section")} type="button">
                Controle operacional
              </button>
            </div>
          </div>

          <div className="hero-panel__visual">
            <div className="hero-summary-grid">
              <button
                className={`hero-status-card hero-status-card--primary hero-status-card--button${activeShortcut === "booking-section" ? " hero-status-card--active" : ""}`}
                onClick={() => scrollToSection("booking-section")}
                type="button"
              >
                <span className="hero-status-card__label">Status operacional</span>
                <strong className="hero-status-card__value">{feedback}</strong>
              </button>

              <button className={`hero-status-card hero-status-card--button${activeShortcut === "agenda-section" ? " hero-status-card--active" : ""}`} onClick={() => scrollToSection("agenda-section")} type="button">
                <span className="hero-status-card__label">Confirmacao do dia</span>
                <strong className="hero-status-card__value">{confirmedRate}%</strong>
              </button>
              <button className={`hero-status-card hero-status-card--button${activeShortcut === "pets-section" ? " hero-status-card--active" : ""}`} onClick={() => scrollToSection("pets-section")} type="button">
                <span className="hero-status-card__label">Base ativa</span>
                <strong className="hero-status-card__value">{activeBase}</strong>
              </button>

              <button
                className={`hero-status-card hero-status-card--accent hero-status-card--button${activeShortcut === "services-section" ? " hero-status-card--active" : ""}`}
                onClick={() => scrollToSection("services-section")}
                type="button"
              >
                <span className="hero-status-card__label">Mix de pets</span>
                <strong className="hero-status-card__value">{petMix}</strong>
              </button>
            </div>
          </div>
        </section>

        <section className="metrics-grid" id="metrics-section">
          <MetricCard
            active={activeShortcut === "agenda-section"}
            detail="Horarios confirmados e pendentes do dia"
            label="Agenda de hoje"
            onClick={() => scrollToSection("agenda-section")}
            tone="sand"
            value={String(dashboard.metrics.todayAppointments)}
          />
          <MetricCard
            active={activeShortcut === "finance-section"}
            detail="Valor ja convertido em caixa no periodo"
            label="Receita recebida"
            onClick={() => scrollToSection("finance-section")}
            tone="peach"
            value={currency(dashboard.metrics.monthlyRevenue)}
          />
          <MetricCard
            active={activeShortcut === "finance-section"}
            detail="Pendencias que ainda precisam de retorno"
            label="Saldo a receber"
            onClick={() => scrollToSection("finance-section")}
            tone="night"
            value={currency(dashboard.metrics.pendingReceivables)}
          />
        </section>

        <section className="content-grid">
          <div className="content-grid__main" id="agenda-section">
            <AppointmentTable
              appointments={dashboard.todayAppointments}
              hiddenAppointments={hiddenTodayAppointments}
              onDeleteAppointment={handleDeleteAppointment}
              onDeleteHiddenAppointment={handleDeleteHiddenAppointment}
              onRestoreAppointment={handleRestoreAppointment}
              onSendReminder={handleSendReminder}
              onUpdateStatus={handleUpdateAppointmentStatus}
            />

            <article className="panel-card panel-card--soft panel-card--finance" id="finance-section">
              <div className="panel-card__header">
                <div>
                  <div className="eyebrow">Caixa do pet shop</div>
                  <h2 className="panel-card__title">Pagamentos pendentes</h2>
                </div>
                <div className="panel-card__header-actions">
                  <span className="panel-badge panel-badge--warning">{pendingChargeCount} pendentes</span>
                  {paidChargeCount > 0 ? (
                    <button className={`panel-badge panel-badge--button${showPaidCharges ? " panel-badge--button-active" : ""}`} onClick={() => setShowPaidCharges((current) => !current)} type="button">
                      {showPaidCharges ? "Ocultar pagas" : `Mostrar pagas (${paidChargeCount})`}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="finance-toolbar">
                <div className="finance-summary-grid">
                  <div className="finance-summary-card finance-summary-card--pending">
                    <span className="finance-summary-card__label">Pendentes</span>
                    <strong>{currency(pendingChargeTotal)}</strong>
                    <span>{pendingChargeCount} cobrancas</span>
                  </div>
                  <div className="finance-summary-card finance-summary-card--paid">
                    <span className="finance-summary-card__label">Pagas</span>
                    <strong>{currency(paidChargeTotal)}</strong>
                    <span>{paidChargeCount} cobrancas</span>
                  </div>
                </div>

                <div className="finance-controls">
                  <label className="finance-filter-field">
                    <span>Ordenar por</span>
                    <select aria-label="Ordenar cobrancas por" className="charge-method-select" onChange={(event) => setChargeSort(event.target.value as "value-desc" | "value-asc" | "time-asc" | "time-desc" | "method")} value={chargeSort}>
                      <option value="time-asc">Horario crescente</option>
                      <option value="time-desc">Horario decrescente</option>
                      <option value="value-desc">Maior valor</option>
                      <option value="value-asc">Menor valor</option>
                      <option value="method">Metodo</option>
                    </select>
                  </label>

                  <div className="finance-method-chips" role="tablist" aria-label="Filtros por metodo de pagamento">
                    {([
                      ["todos", "Todos"],
                      ["pix", "Pix"],
                      ["cartao", "Cartao"],
                      ["dinheiro", "Dinheiro"]
                    ] as const).map(([method, label]) => (
                      <button
                        aria-pressed={chargeMethodFilter === method}
                        className={`finance-method-chip${chargeMethodFilter === method ? " finance-method-chip--active" : ""}`}
                        key={method}
                        onClick={() => setChargeMethodFilter(method)}
                        type="button"
                      >
                        <span>{label}</span>
                        <strong>{methodCounts[method]}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="charge-list">
                {visibleFinanceCharges.map((charge) => (
                  <div key={charge.id} className="charge-list__item">
                    <div className="charge-list__main">
                      <div className="charge-list__headline">
                        <strong>{currency(charge.amount)}</strong>
                        <span className={`charge-list__status-button${charge.paid ? " charge-list__status-button--paid" : " charge-list__status-button--pending"}`}>
                          {charge.paid ? "Pago" : "Nao pago"}
                        </span>
                      </div>
                      <div className="charge-list__meta">
                        <span>Pet: {getChargePetName(charge)}</span>
                        <span>Metodo atual: {charge.method}</span>
                        <span>{charge.appointment ? `Atendimento ${charge.appointment.id.toUpperCase()} | ${charge.appointment.status}` : "Sem atendimento vinculado"}</span>
                      </div>
                    </div>
                    <div className="charge-list__actions">
                      <label className="charge-method-field">
                        <span>Metodo</span>
                        <select className="charge-method-select" aria-label={`Metodo da cobranca ${charge.id}`} onChange={(event) => handleUpdateChargeMethod(charge.id, event.target.value as Charge["method"])} value={charge.method}>
                          <option value="pix">Pix</option>
                          <option value="cartao">Cartao</option>
                          <option value="dinheiro">Dinheiro</option>
                        </select>
                      </label>
                      <div className="charge-payment-drawer">
                        <button
                          aria-controls={`charge-payment-actions-${charge.id}`}
                          aria-expanded={expandedChargeActionId === charge.id}
                          className="charge-action-toggle"
                          onClick={() => setExpandedChargeActionId((current) => current === charge.id ? null : charge.id)}
                          type="button"
                        >
                          Ajustar status
                        </button>
                        {expandedChargeActionId === charge.id ? (
                          <div className="schedule-actions-inline charge-list__buttons charge-list__buttons--drawer" id={`charge-payment-actions-${charge.id}`}>
                            <button className="action-button action-button--secondary action-button--inline" onClick={() => handleUpdateChargePayment(charge.id, true)} type="button">
                              Pago
                            </button>
                            <button className="action-button action-button--ghost action-button--inline" onClick={() => handleUpdateChargePayment(charge.id, false)} type="button">
                              Nao pago
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {visibleFinanceCharges.length === 0 ? (
                  <div className="empty-state">
                    <strong>Nenhuma cobranca visivel nesta filtragem.</strong>
                    <span>{paidChargeCount > 0 || chargeMethodFilter !== "todos" ? "Ajuste o filtro de metodo ou revele as pagas para ampliar a visualizacao." : "Novas cobrancas pendentes aparecerao aqui automaticamente."}</span>
                  </div>
                ) : null}
              </div>
            </article>
          </div>
          <aside className="content-grid__side" id="booking-section">
            <QuickBookingForm customers={customers} pets={pets} services={services} onSubmit={handleCreateAppointment} />
          </aside>
        </section>

        <section className="insights-grid">
          <article className="panel-card panel-card--overview panel-card--overview-hero">
            <div className="panel-card__header">
              <div>
                <div className="eyebrow">Visao geral</div>
                <h2 className="panel-card__title">Rotina organizada para um atendimento mais profissional</h2>
              </div>
            </div>

            <div className="overview-copy">
              <strong>Um painel mais limpo, com foco em clareza, organizacao e rotina de atendimento.</strong>
              <span>Acompanhe os horarios do dia, visualize os pets em atendimento e mantenha o financeiro sob controle sem excesso de elementos visuais.</span>
            </div>
          </article>

          <article className="panel-card panel-card--soft panel-card--pets" id="pets-section">
            <div className="panel-card__header">
              <div>
                <div className="eyebrow">Clientes do dia</div>
                <h2 className="panel-card__title">Pets em atendimento</h2>
              </div>
              <span className="panel-badge">{pets.length} pets</span>
            </div>

            <div className="pet-list">
              {featuredPets.map((pet) => (
                <div key={pet.id} className="pet-list__item">
                  <div className="pet-avatar">{pet.name.slice(0, 1)}</div>
                  <div className="pet-list__content">
                    <strong>{pet.name}</strong>
                    <span>
                      {pet.species} | {pet.breed}
                    </span>
                    <span>
                      Tutor: {pet.customer?.name} | {pet.customer?.phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel-card panel-card--dark panel-card--services" id="services-section">
            <div className="panel-card__header">
              <div>
                <div className="eyebrow eyebrow--light">Serviços do pet shop</div>
                <h2 className="panel-card__title panel-card__title--light">Banho, tosa e cuidados especiais</h2>
              </div>
            </div>

            <div className="service-list">
              {services.map((service) => (
                <div key={service.id} className="service-list__item">
                  <div className="service-list__content">
                    <strong>{service.name}</strong>
                  </div>
                  <span className="service-list__price">{currency(service.price)}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        {isLoading ? (
          <section className="panel-card panel-card--loading">
            <p className="mb-0">Atualizando dados do painel...</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
