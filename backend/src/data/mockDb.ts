export type AppointmentStatus = "confirmado" | "pendente" | "concluido" | "cancelado";

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
  status: AppointmentStatus;
  reminderSent: boolean;
  hiddenFromQueue: boolean;
}

export interface Charge {
  id: string;
  appointmentId: string;
  amount: number;
  paid: boolean;
  method: "pix" | "cartao" | "dinheiro";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: "admin";
  createdAt: string;
}

const seedCustomers: Customer[] = [
  {
    id: "c1",
    name: "Mariana Alves",
    phone: "+55 11 99123-4567",
    email: "mariana@cliente.com"
  },
  {
    id: "c2",
    name: "Rafael Costa",
    phone: "+55 11 98888-2222",
    email: "rafael@cliente.com"
  },
  {
    id: "c3",
    name: "Bianca Silva",
    phone: "+55 11 97777-4444",
    email: "bianca@cliente.com"
  }
];

const seedPets: Pet[] = [
  {
    id: "p1",
    customerId: "c1",
    name: "Luna",
    species: "Canina",
    breed: "Shih-tzu",
    notes: "Sensivel a secador muito quente"
  },
  {
    id: "p2",
    customerId: "c2",
    name: "Thor",
    species: "Canina",
    breed: "Golden Retriever"
  },
  {
    id: "p3",
    customerId: "c3",
    name: "Mimi",
    species: "Felina",
    breed: "Persa"
  }
];

const seedServices: ServiceItem[] = [
  {
    id: "s1",
    name: "Banho",
    durationMinutes: 60,
    price: 60
  },
  {
    id: "s2",
    name: "Tosa",
    durationMinutes: 45,
    price: 55
  },
  {
    id: "s3",
    name: "Banho e tosa completa",
    durationMinutes: 90,
    price: 95
  },
  {
    id: "s4",
    name: "Banho hidratante",
    durationMinutes: 70,
    price: 78
  },
  {
    id: "s5",
    name: "Banho antipulgas",
    durationMinutes: 75,
    price: 85
  },
  {
    id: "s6",
    name: "Tosa completa",
    durationMinutes: 80,
    price: 88
  },
  {
    id: "s7",
    name: "Tosa na tesoura",
    durationMinutes: 70,
    price: 82
  },
  {
    id: "s8",
    name: "Consulta veterinaria",
    durationMinutes: 40,
    price: 120
  },
  {
    id: "s9",
    name: "Consulta de retorno",
    durationMinutes: 30,
    price: 70
  }
];

const seedAppointments: Appointment[] = [
  {
    id: "a1",
    customerId: "c1",
    petId: "p1",
    serviceId: "s3",
    startsAt: "2026-03-28T09:00:00.000Z",
    status: "confirmado",
    reminderSent: true,
    hiddenFromQueue: false
  },
  {
    id: "a2",
    customerId: "c2",
    petId: "p2",
    serviceId: "s1",
    startsAt: "2026-03-28T11:00:00.000Z",
    status: "pendente",
    reminderSent: false,
    hiddenFromQueue: false
  },
  {
    id: "a3",
    customerId: "c3",
    petId: "p3",
    serviceId: "s2",
    startsAt: "2026-03-28T14:30:00.000Z",
    status: "confirmado",
    reminderSent: false,
    hiddenFromQueue: false
  }
];

const seedCharges: Charge[] = [
  {
    id: "ch1",
    appointmentId: "a1",
    amount: 95,
    paid: true,
    method: "pix"
  },
  {
    id: "ch2",
    appointmentId: "a2",
    amount: 60,
    paid: false,
    method: "cartao"
  },
  {
    id: "ch3",
    appointmentId: "a3",
    amount: 55,
    paid: false,
    method: "dinheiro"
  }
];

const seedAuthUsers: AuthUser[] = [];

export const customers: Customer[] = structuredClone(seedCustomers);

export const pets: Pet[] = structuredClone(seedPets);

export const services: ServiceItem[] = structuredClone(seedServices);

export const appointments: Appointment[] = structuredClone(seedAppointments);

export const charges: Charge[] = structuredClone(seedCharges);

export const authUsers: AuthUser[] = structuredClone(seedAuthUsers);

export function resetMockDb() {
  customers.splice(0, customers.length, ...structuredClone(seedCustomers));
  pets.splice(0, pets.length, ...structuredClone(seedPets));
  services.splice(0, services.length, ...structuredClone(seedServices));
  appointments.splice(0, appointments.length, ...structuredClone(seedAppointments));
  charges.splice(0, charges.length, ...structuredClone(seedCharges));
  authUsers.splice(0, authUsers.length, ...structuredClone(seedAuthUsers));
}
