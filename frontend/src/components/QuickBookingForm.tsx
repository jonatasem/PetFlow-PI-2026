import { useState, type FormEvent } from "react";
import type { Customer, Pet, ServiceItem } from "../types";
import type { CreateAppointmentPayload } from "../api/client";

interface QuickBookingFormProps {
  customers: Customer[];
  pets: Pet[];
  services: ServiceItem[];
  onSubmit: (payload: CreateAppointmentPayload) => Promise<void>;
}

export function QuickBookingForm({ customers, pets, services, onSubmit }: QuickBookingFormProps) {
  function normalizeText(value: string) {
    return value.trim().toLowerCase();
  }

  function parsePrice(value: string) {
    const normalizedValue = value.replace(/\s/g, "").replace(",", ".");

    if (!normalizedValue) {
      return undefined;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  function buildDefaultDateTime() {
    const nextDate = new Date();
    nextDate.setMinutes(0, 0, 0);
    nextDate.setHours(nextDate.getHours() + 1);

    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, "0");
    const day = String(nextDate.getDate()).padStart(2, "0");
    const hours = String(nextDate.getHours()).padStart(2, "0");
    const minutes = String(nextDate.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    petName: "",
    petSpecies: "",
    petBreed: "",
    serviceName: "",
    servicePrice: "",
    startsAt: buildDefaultDateTime()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchedCustomer = customers.find((customer) => normalizeText(customer.name) === normalizeText(formData.customerName));
  const availablePets = matchedCustomer ? pets.filter((pet) => pet.customerId === matchedCustomer.id) : pets;
  const matchedPet = availablePets.find((pet) => normalizeText(pet.name) === normalizeText(formData.petName));
  const selectedService = services.find((service) => normalizeText(service.name) === normalizeText(formData.serviceName));
  const parsedServicePrice = parsePrice(formData.servicePrice);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.customerName.trim() || !formData.petName.trim() || !formData.serviceName.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        customerId: matchedCustomer?.id,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim() || matchedCustomer?.phone,
        petId: matchedPet?.id,
        petName: formData.petName.trim(),
        petSpecies: formData.petSpecies.trim() || matchedPet?.species,
        petBreed: formData.petBreed.trim() || matchedPet?.breed,
        serviceId: selectedService?.id,
        serviceName: formData.serviceName.trim(),
        servicePrice: parsedServicePrice ?? selectedService?.price,
        startsAt: formData.startsAt
      });
      setFormData({
        customerName: "",
        customerPhone: "",
        petName: "",
        petSpecies: "",
        petBreed: "",
        serviceName: "",
        servicePrice: "",
        startsAt: buildDefaultDateTime()
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel-card panel-card--booking" onSubmit={handleSubmit}>
      <div className="panel-card__header">
        <div>
          <div className="eyebrow">Novo agendamento</div>
          <h2 className="panel-card__title">Novo atendimento</h2>
        </div>
      </div>

      <div className="booking-highlight">
        <span className="booking-highlight__label">Resumo do serviço</span>
        <strong>{selectedService?.name ?? (formData.serviceName || "Digite ou escolha um serviço")}</strong>
        <span>
          {selectedService
            ? `${selectedService.durationMinutes} min | R$ ${(parsedServicePrice ?? selectedService.price).toFixed(2)}`
            : parsedServicePrice !== undefined
              ? `Valor informado | R$ ${parsedServicePrice.toFixed(2)}`
              : "Digite manualmente o serviço e o valor do atendimento."}
        </span>
      </div>

      <p className="booking-hint">Digite cliente, pet, serviço e valor manualmente para registrar o atendimento.</p>

      <div className="mb-3">
        <label className="form-label booking-label" htmlFor="booking-customer-name">Cliente</label>
        <input
          id="booking-customer-name"
          className="form-control booking-control"
          placeholder="Nome do cliente"
          type="text"
          value={formData.customerName}
          onChange={(event) => setFormData((current) => ({ ...current, customerName: event.target.value }))}
        />
      </div>

      <div className="mb-3">
        <label className="form-label booking-label" htmlFor="booking-customer-phone">Telefone do cliente</label>
        <input
          id="booking-customer-phone"
          className="form-control booking-control"
          placeholder="(11) 99999-9999"
          type="text"
          value={formData.customerPhone}
          onChange={(event) => setFormData((current) => ({ ...current, customerPhone: event.target.value }))}
        />
      </div>

      <div className="mb-3">
        <label className="form-label booking-label" htmlFor="booking-pet-name">Pet</label>
        <input
          id="booking-pet-name"
          className="form-control booking-control"
          placeholder="Nome do pet"
          type="text"
          value={formData.petName}
          onChange={(event) => setFormData((current) => ({ ...current, petName: event.target.value }))}
        />
      </div>

      <div className="booking-grid">
        <div className="mb-3">
          <label className="form-label booking-label" htmlFor="booking-pet-species">Especie</label>
          <input
            id="booking-pet-species"
            className="form-control booking-control"
            placeholder="Canina, felina..."
            type="text"
            value={formData.petSpecies}
            onChange={(event) => setFormData((current) => ({ ...current, petSpecies: event.target.value }))}
          />
        </div>

        <div className="mb-3">
          <label className="form-label booking-label" htmlFor="booking-pet-breed">Raca</label>
          <input
            id="booking-pet-breed"
            className="form-control booking-control"
            placeholder="Shih-tzu, SRD..."
            type="text"
            value={formData.petBreed}
            onChange={(event) => setFormData((current) => ({ ...current, petBreed: event.target.value }))}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label booking-label" htmlFor="booking-service-name">Serviço</label>
        <input
          id="booking-service-name"
          className="form-control booking-control"
          placeholder="Banho, tosa, consulta ou outro serviço"
          type="text"
          value={formData.serviceName}
          onChange={(event) => setFormData((current) => ({ ...current, serviceName: event.target.value }))}
        />
      </div>

      <div className="mb-3">
        <label className="form-label booking-label" htmlFor="booking-service-price">Valor do serviço</label>
        <input
          id="booking-service-price"
          className="form-control booking-control"
          inputMode="decimal"
          placeholder="Ex.: 65,00"
          type="text"
          value={formData.servicePrice}
          onChange={(event) => setFormData((current) => ({ ...current, servicePrice: event.target.value }))}
        />
      </div>

      <div className="mb-4">
        <label className="form-label booking-label" htmlFor="booking-starts-at">Horario</label>
        <input
          id="booking-starts-at"
          className="form-control booking-control"
          type="datetime-local"
          value={formData.startsAt}
          onChange={(event) => setFormData((current) => ({ ...current, startsAt: event.target.value }))}
        />
      </div>

      <button className="action-button action-button--primary w-100" disabled={isSubmitting || !formData.customerName.trim() || !formData.petName.trim() || !formData.serviceName.trim()} type="submit">
        {isSubmitting ? "Salvando..." : "Salvar agendamento"}
      </button>
    </form>
  );
}
