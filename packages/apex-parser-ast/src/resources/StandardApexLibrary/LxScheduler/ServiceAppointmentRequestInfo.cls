/**
 * Represents the list of parameters that are passed to the ServiceResourceScheduleHandler interface. This class is implemented internally by Apex.
 */
global class ServiceAppointmentRequestInfo {

  public ServiceAppointmentRequestInfo(Datetime startDate, Datetime endDate, List<lxscheduler.ServiceResourceInfo> ServiceResources, String SchedulingPolicyId, String workTypeGroupId, String accountId, String primaryResourceId, String workTypeId, String correlationId) {}

  /**
   * Returns the account ID of the customer if the API request contains one.
   * @return String
   */
  public String getAccountId() {}

  /**
   * Returns a unique identifier for a request.
   * @return String
   */
  public String getCorrelationId() {}

  /**
   * Returns the end date and time for which unavailable time slots are requested.
   * @return Datetime
   */
  public Datetime getEndDate() {}

  /**
   * Returns the ID of the primary service resource.
   * @return String
   */
  public String getPrimaryResourceId() {}

  /**
   * Returns the ID of the scheduling policy that the API request contains.
   * @return String
   */
  public String getSchedulingPolicyId() {}

  /**
   * Returns the list of requested service resources for the unavailable time slots.
   * @return List<lxscheduler.ServiceResourceInfo>
   */
  public List<lxscheduler.ServiceResourceInfo> getServiceResources() {}

  /**
   * Returns the start date and time for which unavailable time slots are requested.
   * @return Datetime
   */
  public Datetime getStartDate() {}

  /**
   * Returns the work type group ID if the API request contains one.
   * @return String
   */
  public String getWorkTypeGroupId() {}

  /**
   * Returns the work type ID if the API request contains one.
   * @return String
   */
  public String getWorkTypeId() {}

}