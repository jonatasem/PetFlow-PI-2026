export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface Pet {
  id: string;
  customerId: string;
  name: string;
  species: string;
  breed: string;
  notes?: string;
  customer?: Customer;
}

export interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export interface Appointment {
  id: string;
  customerId: string;
  petId: string;
  serviceId: string;
  startsAt: string;
  status: "confirmado" | "pendente" | "concluido" | "cancelado";
  reminderSent: boolean;
  hiddenFromQueue: boolean;
  customer?: Customer;
  pet?: Pet;
  service?: ServiceItem;
}

export interface Charge {
  id: string;
  appointmentId: string;
  amount: number;
  paid: boolean;
  method: "pix" | "cartao" | "dinheiro";
  appointment?: Appointment;
}

export interface DashboardData {
  metrics: {
    clients: number;
    pets: number;
    services: number;
    todayAppointments: number;
    confirmedAppointments: number;
    pendingReceivables: number;
    monthlyRevenue: number;
  };
  todayAppointments: Appointment[];
  pendingCharges: Charge[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  email: string;
  name: string;
  role: "admin";
  expiresAt: string;
}
