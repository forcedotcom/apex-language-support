/**
 * Contains result of the service appointment.
 */
global class ServiceAppointmentResult {

  /**
   * The IDs of the assigned resources.
   */
  global List < String > assignedResourceIds;

  /**
   * The ID of the parent record.
   */
  global String parentRecordId;

  /**
   * The ID of the service appointment record.
   */
  global String serviceAppointmentId;

}