/**
 * Contains information to update a service appointment.
 */
global class UpdateServiceAppointmentInput {

  /**
   * The ID of the service appointment to be modified.
   */
  global String serviceAppointmentId;

  /**
   * Represents the service resources who are assigned to a service appointment. When updating an appointment, pass the complete list of required resources. If you don’t pass a resource who is already assigned to the appointment, the API deletes that assigned resource. For example, suppose that an existing service appointment has assigned resources: A and B and you pass B and C in assigned resources in the PATCH request. The API checks the resource availability of B and C for existing work type and service territory, and if both are available, the service appointment gets updated with: Resource A—Deleted ResourceB—Updated ResourceC—Created However, if you don’t pass any of the assigned resources, the API assumes there’s no change. Note When creating an appointment, use extendedFields to add values to any of the fields, including custom fields, in assignedResources as long as you have edit access to those fields.
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
   * Represents the service appointment details to book an appointment. When updating an appointment, pass only the fields that must be updated. Note When creating an appointment, use extendedFields to add values to any of the fields, including custom fields, in assignedResources as long as you have edit access to those fields.
   */
  global ConnectApi.ServiceAppointmentInput serviceAppointment;

}