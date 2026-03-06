/**
 * Contains information to create a service appointment.
 */
global class CreateServiceAppointmentInput {

  /**
   * Represents the service resources to be assigned to a service appointment. Note When creating an appointment, use extendedFields to add values to any of the fields, including custom fields, in assignedResources as long as you have edit access to those fields.
   */
  global List < ConnectApi.AssignedResourcesInput > assignedResources;

  /**
   * Represents a prospect or lead. Note Required to create a service appointment for unauthenticated guest users.
   */
  global ConnectApi.LeadInput lead;

  /**
   * The ID of the AppointmentSchedulingPolicy object. If no scheduling policy is passed in the request body, the default configurations are used. The only scheduling policy configuration that is used in determining time slots is the enforcement of account visiting hours.
   */
  global String schedulingPolicyId;

  /**
   * Represents the service appointment details to book an appointment. Note When creating an appointment, use extendedFields to add values to any of the fields, including custom fields, in assignedResources as long as you have edit access to those fields.
   */
  global ConnectApi.ServiceAppointmentInput serviceAppointment;

}