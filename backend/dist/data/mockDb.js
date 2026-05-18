"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authUsers = exports.charges = exports.appointments = exports.services = exports.pets = exports.customers = void 0;
exports.resetMockDb = resetMockDb;
const seedCustomers = [
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
const seedPets = [
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
const seedServices = [
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
const seedAppointments = [
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
const seedCharges = [
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
const seedAuthUsers = [];
exports.customers = structuredClone(seedCustomers);
exports.pets = structuredClone(seedPets);
exports.services = structuredClone(seedServices);
exports.appointments = structuredClone(seedAppointments);
exports.charges = structuredClone(seedCharges);
exports.authUsers = structuredClone(seedAuthUsers);
function resetMockDb() {
    exports.customers.splice(0, exports.customers.length, ...structuredClone(seedCustomers));
    exports.pets.splice(0, exports.pets.length, ...structuredClone(seedPets));
    exports.services.splice(0, exports.services.length, ...structuredClone(seedServices));
    exports.appointments.splice(0, exports.appointments.length, ...structuredClone(seedAppointments));
    exports.charges.splice(0, exports.charges.length, ...structuredClone(seedCharges));
    exports.authUsers.splice(0, exports.authUsers.length, ...structuredClone(seedAuthUsers));
}
