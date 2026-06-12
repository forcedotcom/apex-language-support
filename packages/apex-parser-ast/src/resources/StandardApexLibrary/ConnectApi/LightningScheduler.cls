/**
 * Create and update service appointments.
 */
global class LightningScheduler {

  global LightningScheduler() {}

  global static ConnectApi.ServiceAppointmentOutput createServiceAppointment(ConnectApi.CreateServiceAppointmentInput createServiceAppointmentInput) {}

  global static ConnectApi.ServiceAppointmentOutput updateServiceAppointment(ConnectApi.UpdateServiceAppointmentInput updateServiceAppointmentInput) {}

  global Object clone() {}

}