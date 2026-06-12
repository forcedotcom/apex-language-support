/**
 * Represents the list of parameters that are passed to the ServiceResourceScheduleHandler interface. This class is implemented internally by Apex.
 */
global class ServiceAppointmentRequestInfo {

  global ServiceAppointmentRequestInfo(Datetime startDate, Datetime endDate, List<lxscheduler.ServiceResourceInfo> ServiceResources, String SchedulingPolicyId, String workTypeGroupId, String accountId, String primaryResourceId, String workTypeId, String correlationId) {}

  /**
   * Returns the account ID of the customer if the API request contains one.
   * @return String
   */
  global String getAccountId() {}

  /**
   * Returns a unique identifier for a request.
   * @return String
   */
  global String getCorrelationId() {}

  /**
   * Returns the end date and time for which unavailable time slots are requested.
   * @return Datetime
   */
  global Datetime getEndDate() {}

  /**
   * Returns the ID of the primary service resource.
   * @return String
   */
  global String getPrimaryResourceId() {}

  /**
   * Returns the ID of the scheduling policy that the API request contains.
   * @return String
   */
  global String getSchedulingPolicyId() {}

  /**
   * Returns the list of requested service resources for the unavailable time slots.
   * @return List<lxscheduler.ServiceResourceInfo>
   */
  global List<lxscheduler.ServiceResourceInfo> getServiceResources() {}

  /**
   * Returns the start date and time for which unavailable time slots are requested.
   * @return Datetime
   */
  global Datetime getStartDate() {}

  /**
   * Returns the work type group ID if the API request contains one.
   * @return String
   */
  global String getWorkTypeGroupId() {}

  /**
   * Returns the work type ID if the API request contains one.
   * @return String
   */
  global String getWorkTypeId() {}

  global Object clone() {}

}