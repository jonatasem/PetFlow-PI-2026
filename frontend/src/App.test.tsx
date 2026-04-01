import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { AUTH_STORAGE_KEY } from "./auth/session";
import type { Appointment, AuthSession, Charge, Customer, DashboardData, Pet, RegisterResponse, ServiceItem } from "./types";
import * as api from "./api/client";

vi.mock("./api/client", async () => {
  const actual = await vi.importActual<typeof import("./api/client")>("./api/client");

  return {
    ...actual,
    getDashboard: vi.fn(),
    getAppointments: vi.fn(),
    getCharges: vi.fn(),
    getCustomers: vi.fn(),
    getPets: vi.fn(),
    getServices: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    createAppointment: vi.fn(),
    deleteAppointment: vi.fn(),
    removeAppointmentFromQueue: vi.fn(),
    restoreAppointmentToQueue: vi.fn(),
    sendReminder: vi.fn(),
    updateAppointmentStatus: vi.fn(),
    updateChargePaymentStatus: vi.fn(),
    updateChargePaymentMethod: vi.fn()
  };
});

const mockDashboard: DashboardData = {
  metrics: {
    clients: 3,
    pets: 3,
    services: 9,
    todayAppointments: 3,
    confirmedAppointments: 2,
    pendingReceivables: 115,
    monthlyRevenue: 95
  },
  todayAppointments: [],
  pendingCharges: [
    {
      id: "ch2",
      appointmentId: "a2",
      amount: 55,
      paid: false,
      method: "pix"
    }
  ]
};

const mockAppointments: Appointment[] = [
  {
    id: "a2",
    customerId: "c2",
    petId: "p2",
    serviceId: "s2",
    startsAt: "2026-03-28T10:00:00.000Z",
    status: "pendente",
    reminderSent: false,
    hiddenFromQueue: false
  },
  {
    id: "a3",
    customerId: "c3",
    petId: "p3",
    serviceId: "s3",
    startsAt: "2026-03-28T11:00:00.000Z",
    status: "confirmado",
    reminderSent: false,
    hiddenFromQueue: false
  }
];

const mockCharges: Charge[] = [
  {
    id: "ch2",
    appointmentId: "a2",
    amount: 55,
    paid: false,
    method: "pix",
    appointment: mockAppointments[0]
  },
  {
    id: "ch3",
    appointmentId: "a3",
    amount: 95,
    paid: true,
    method: "cartao",
    appointment: mockAppointments[1]
  }
];

const mockCustomers: Customer[] = [];
const mockSession: AuthSession = {
  token: "demo-token",
  email: "admin@petflow.com",
  name: "PetFlow Admin",
  role: "admin",
  expiresAt: "2026-03-29T12:00:00.000Z"
};
const mockRegisterResponse: RegisterResponse = {
  email: "admin@petflow.com",
  name: "PetFlow Admin",
  role: "admin",
  createdAt: "2026-03-28T12:00:00.000Z",
  message: "Cadastro realizado com sucesso. Faca login para continuar."
};
const mockPets: Pet[] = [
  {
    id: "p2",
    customerId: "c2",
    name: "Thor",
    species: "Canino",
    breed: "Shih Tzu"
  },
  {
    id: "p3",
    customerId: "c3",
    name: "Mel",
    species: "Felino",
    breed: "Siamese"
  }
];
const mockServices: ServiceItem[] = [];

function setupApiMocks() {
  vi.mocked(api.login).mockResolvedValue(mockSession);
  vi.mocked(api.register).mockResolvedValue(mockRegisterResponse);
  vi.mocked(api.getDashboard).mockResolvedValue(mockDashboard);
  vi.mocked(api.getAppointments).mockResolvedValue(mockAppointments);
  vi.mocked(api.getCharges).mockResolvedValue(mockCharges);
  vi.mocked(api.getCustomers).mockResolvedValue(mockCustomers);
  vi.mocked(api.getPets).mockResolvedValue(mockPets);
  vi.mocked(api.getServices).mockResolvedValue(mockServices);
  vi.mocked(api.updateChargePaymentStatus).mockResolvedValue(mockCharges[0]);
  vi.mocked(api.updateChargePaymentMethod).mockResolvedValue({
    ...mockCharges[0],
    method: "dinheiro"
  });
}

describe("App finance interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockSession));
    setupApiMocks();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("realiza login e libera o painel", async () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: "Entre com sua conta" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "admin@petflow.com");
    await user.type(screen.getByLabelText("Senha"), "PetFlow@2026");
    await user.click(screen.getByRole("button", { name: "Entrar no painel" }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({
        email: "admin@petflow.com",
        password: "PetFlow@2026"
      });
    });

    expect(await screen.findByText("Pagamentos pendentes")).toBeInTheDocument();
  });

  it("cadastra conta e volta para a aba de login", async () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await user.type(screen.getByLabelText("Nome completo"), "PetFlow Admin");
    await user.type(screen.getByLabelText("Email"), "admin@petflow.com");
    await user.type(screen.getByLabelText("Senha forte"), "PetFlow@2026");
    await user.type(screen.getByLabelText("Confirmar senha"), "PetFlow@2026");
    await user.click(screen.getByRole("button", { name: "Criar conta segura" }));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        name: "PetFlow Admin",
        email: "admin@petflow.com",
        password: "PetFlow@2026"
      });
    });

    expect(await screen.findByText(/Cadastro realizado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entre com sua conta" })).toBeInTheDocument();
  });

  it("mostra erro visual quando o login eh invalido", async () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    vi.mocked(api.login).mockRejectedValueOnce(new Error("Email ou senha invalidos."));
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("Email"), "admin@petflow.com");
    await user.type(screen.getByLabelText("Senha"), "senha-errada");
    await user.click(screen.getByRole("button", { name: "Entrar no painel" }));

    expect(await screen.findByText("Email ou senha invalidos.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entre com sua conta" })).toBeInTheDocument();
  });

  it("faz logout e volta para a tela de login", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Pagamentos pendentes");
    await user.click(screen.getByRole("button", { name: "Sair do painel" }));

    expect(screen.getByRole("heading", { name: "Entre com sua conta" })).toBeInTheDocument();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("restaura sessao persistida sem exigir novo login", async () => {
    render(<App />);

    expect(await screen.findByText("Pagamentos pendentes")).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it("mostra sessao expirada quando a API devolve 401", async () => {
    vi.mocked(api.getDashboard).mockRejectedValueOnce(new api.ApiError("Sessao expirada. Faca login novamente.", 401));

    render(<App />);

    expect(await screen.findByText("Sessao expirada")).toBeInTheDocument();
    expect(screen.getByText("Sessao expirada. Faca login novamente.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entre com sua conta" })).toBeInTheDocument();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("mostra apenas cobrancas pendentes por padrao e revela pagas sob demanda", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Pet: Thor")).toBeInTheDocument();
    expect(screen.queryByText("Pet: Mel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mostrar pagas (1)" }));

    expect(await screen.findByText("Pet: Mel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar pagas" })).toBeInTheDocument();
  });

  it("filtra cobrancas por metodo de pagamento", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Pet: Thor");
    await user.click(screen.getByRole("button", { name: "Mostrar pagas (1)" }));
    await user.click(screen.getByRole("button", { name: /Cartao 1/i }));

    expect(await screen.findByText("Pet: Mel")).toBeInTheDocument();
    expect(screen.queryByText("Pet: Thor")).not.toBeInTheDocument();
  });

  it("ordena cobrancas por maior valor", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Pet: Thor");
    await user.click(screen.getByRole("button", { name: "Mostrar pagas (1)" }));
    await user.selectOptions(screen.getByLabelText("Ordenar cobrancas por"), "value-desc");

    const labels = screen.getAllByText(/Pet:/i).map((item) => item.textContent);
    expect(labels[0]).toContain("Mel");
    expect(labels[1]).toContain("Thor");
  });

  it("mostra totais separados de pagas e pendentes", async () => {
    render(<App />);

    expect(await screen.findByText("Pendentes")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 55,00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 cobrancas").length).toBeGreaterThan(0);
    expect(screen.getByText("Pagas")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 95,00").length).toBeGreaterThan(0);
  });

  it("mostra o status Nao pago para cobranca em aberto", async () => {
    render(<App />);

    const petLabel = await screen.findByText("Pet: Thor");
    const chargeItem = petLabel.closest(".charge-list__item");
    const statusBadge = chargeItem?.querySelector(".charge-list__status-button");

    expect(chargeItem).not.toBeNull();
    expect(statusBadge).not.toBeNull();
    expect(statusBadge).toHaveTextContent("Nao pago");
  });

  it("aciona atualizacao ao clicar em Pago", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Pet: Thor");
    await user.click(screen.getByRole("button", { name: "Ajustar status" }));
    await user.click(screen.getByRole("button", { name: "Pago" }));

    await waitFor(() => {
      expect(api.updateChargePaymentStatus).toHaveBeenCalledWith("ch2", true);
    });
  });

  it("aciona atualizacao ao clicar em Nao pago para cobranca ja paga", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Pet: Thor");
    await user.click(screen.getByRole("button", { name: "Mostrar pagas (1)" }));
    await screen.findByText("Pet: Mel");
    await user.click(screen.getAllByRole("button", { name: "Ajustar status" })[1]!);

    const noPaidButtons = screen.getAllByRole("button", { name: "Nao pago" });
    await user.click(noPaidButtons[0]!);

    await waitFor(() => {
      expect(api.updateChargePaymentStatus).toHaveBeenCalledWith("ch3", false);
    });
  });

  it("aciona atualizacao ao trocar o metodo de pagamento", async () => {
    const user = userEvent.setup();
    render(<App />);

    const [select] = await screen.findAllByLabelText("Metodo da cobranca ch2");
    await user.selectOptions(select, "dinheiro");

    await waitFor(() => {
      expect(api.updateChargePaymentMethod).toHaveBeenCalledWith("ch2", "dinheiro");
    });
  });
});