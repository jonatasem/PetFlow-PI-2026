import { useState } from "react";
import type { Appointment } from "../types";

interface AppointmentTableProps {
  appointments: Appointment[];
  hiddenAppointments: Appointment[];
  onDeleteAppointment: (appointmentId: string) => void;
  onDeleteHiddenAppointment: (appointmentId: string) => void;
  onRestoreAppointment: (appointmentId: string) => void;
  onSendReminder: (appointmentId: string) => void;
  onUpdateStatus: (appointmentId: string, status: Appointment["status"]) => void;
}

export function AppointmentTable({ appointments, hiddenAppointments, onDeleteAppointment, onDeleteHiddenAppointment, onRestoreAppointment, onSendReminder, onUpdateStatus }: AppointmentTableProps) {
  const [leavingAppointmentIds, setLeavingAppointmentIds] = useState<string[]>([]);

  function formatTime(value: string) {
    return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function handleRemoveFromQueue(appointmentId: string) {
    setLeavingAppointmentIds((current) => [...current, appointmentId]);

    window.setTimeout(() => {
      onDeleteAppointment(appointmentId);
      setLeavingAppointmentIds((current) => current.filter((id) => id !== appointmentId));
    }, 220);
  }

  function getStatusActions(status: Appointment["status"]) {
    if (status === "pendente") {
      return [
        { label: "Confirmar", nextStatus: "confirmado" as const, className: "action-button action-button--secondary action-button--inline" },
        { label: "Cancelar", nextStatus: "cancelado" as const, className: "action-button action-button--danger action-button--inline" }
      ];
    }

    if (status === "confirmado") {
      return [
        { label: "Concluir", nextStatus: "concluido" as const, className: "action-button action-button--secondary action-button--inline" },
        { label: "Cancelar", nextStatus: "cancelado" as const, className: "action-button action-button--danger action-button--inline" }
      ];
    }

    return [];
  }

  function getReminderLabel(reminderSent: boolean) {
    return reminderSent ? "Reenviar lembrete" : "Enviar lembrete";
  }

  return (
    <div className="panel-card panel-card--schedule">
      <div className="panel-card__header panel-card__header--schedule">
        <div>
          <div className="eyebrow eyebrow--schedule">Agenda do dia</div>
          <h2 className="panel-card__title">Fila de atendimento</h2>
        </div>
        <span className="panel-badge">{appointments.length} horarios</span>
      </div>

      {appointments.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhum horario cadastrado para hoje.</strong>
          <span>Use o formulario para preencher a agenda e ativar os lembretes.</span>
        </div>
      ) : null}

      {appointments.length > 0 ? (
        <>
          <div className="schedule-cards d-lg-none">
            {appointments.map((appointment) => (
              <article key={appointment.id} className={`schedule-card-mobile${leavingAppointmentIds.includes(appointment.id) ? " schedule-card-mobile--leaving" : ""}`}>
                <div className="schedule-card-mobile__top">
                  <div>
                    <strong>{appointment.pet?.name}</strong>
                    <span>{appointment.customer?.name}</span>
                  </div>
                  <span className={`status-pill status-pill--${appointment.status}`}>{appointment.status}</span>
                </div>
                <div className="schedule-card-mobile__meta">
                  <span className="schedule-time-badge">{formatTime(appointment.startsAt)}</span>
                  <span className="schedule-service-tag">{appointment.service?.name}</span>
                </div>
                <div className="schedule-actions-mobile">
                  {getStatusActions(appointment.status).map((action) => (
                    <button
                      key={action.nextStatus}
                      className={action.className}
                      onClick={() => onUpdateStatus(appointment.id, action.nextStatus)}
                      type="button"
                    >
                      {action.label}
                    </button>
                  ))}
                  <button
                    className="action-button action-button--ghost"
                    onClick={() => onSendReminder(appointment.id)}
                    type="button"
                  >
                    {getReminderLabel(appointment.reminderSent)}
                  </button>
                  <button className="action-button action-button--danger" onClick={() => handleRemoveFromQueue(appointment.id)} type="button">
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="table-responsive d-none d-lg-block">
            <table className="table schedule-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Horario</th>
                  <th>Cliente</th>
                  <th>Pet</th>
                  <th>Serviço</th>
                  <th>Status</th>
                  <th className="text-end">Acao</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr className={leavingAppointmentIds.includes(appointment.id) ? "schedule-row--leaving" : ""} key={appointment.id}>
                    <td>
                      <span className="schedule-time-badge">{formatTime(appointment.startsAt)}</span>
                    </td>
                    <td>
                      <span className="schedule-table__primary">{appointment.customer?.name}</span>
                    </td>
                    <td>
                      <span className="schedule-table__primary">{appointment.pet?.name}</span>
                    </td>
                    <td>
                      <span className="schedule-service-tag">{appointment.service?.name}</span>
                    </td>
                    <td>
                      <span className={`status-pill status-pill--${appointment.status}`}>{appointment.status}</span>
                    </td>
                    <td className="text-end">
                      <div className="schedule-actions-inline">
                        {getStatusActions(appointment.status).map((action) => (
                          <button
                            key={action.nextStatus}
                            className={action.className}
                            onClick={() => onUpdateStatus(appointment.id, action.nextStatus)}
                            type="button"
                          >
                            {action.label}
                          </button>
                        ))}
                        <button
                          className="action-button action-button--ghost action-button--inline"
                          onClick={() => onSendReminder(appointment.id)}
                          type="button"
                        >
                          {getReminderLabel(appointment.reminderSent)}
                        </button>
                        <button className="action-button action-button--danger action-button--inline" onClick={() => handleRemoveFromQueue(appointment.id)} type="button">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {hiddenAppointments.length > 0 ? (
        <div className="queue-hidden-block">
          <div className="panel-card__footer panel-card__footer--queue">
            <strong>Atendimentos fora da fila</strong>
            <span>Use recolocar para devolver um atendimento para a agenda de hoje.</span>
          </div>
          <div className="queue-hidden-list">
            {hiddenAppointments.map((appointment) => (
              <div className="queue-hidden-item" key={appointment.id}>
                <div>
                  <strong>{appointment.pet?.name}</strong>
                  <span>
                    {appointment.customer?.name} | {formatTime(appointment.startsAt)}
                  </span>
                </div>
                <div className="queue-hidden-actions">
                  <button className="action-button action-button--secondary action-button--inline" onClick={() => onRestoreAppointment(appointment.id)} type="button">
                    Recolocar na fila
                  </button>
                  <button className="action-button action-button--danger action-button--inline" onClick={() => onDeleteHiddenAppointment(appointment.id)} type="button">
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel-card__footer">
        <span>Visualizacao simples dos proximos atendimentos.</span>
      </div>
    </div>
  );
}
