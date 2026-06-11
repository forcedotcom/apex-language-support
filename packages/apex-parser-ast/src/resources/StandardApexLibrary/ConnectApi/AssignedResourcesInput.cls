/**
 * Contains information about assigned resources for a service appointment.
 */
global class AssignedResourcesInput {

  global AssignedResourcesInput() {}

  /**
   * Use to add values to any of the fields, including custom fields.
   */
  global List < ConnectApi.ExtendedFieldInput > extendedFields;

  /**
   * Indicates whether an assigned resource is a primary resource. Note For multi-resource appointments, only one resource can be a primary resource.
   */
  global Boolean isPrimaryResource;

  /**
   * Indicates whether an assigned resource is a required resource.
   */
  global Boolean isRequiredResource;

  /**
   * The ID of the service resource assigned to the service appointment.
   */
  global String serviceResourceId;

  global Object clone() {}

}