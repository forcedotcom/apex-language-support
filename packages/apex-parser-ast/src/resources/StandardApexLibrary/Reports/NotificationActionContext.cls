/**
 * Contains information about the report instance and condition threshold for a report notification.
 */
global class NotificationActionContext {

  /**
   * Returns the report instance associated with the notification.
   * @return Reports.ReportInstance
   */
  public Reports.ReportInstance getReportInstance() {}

  /**
   * Returns the threshold information associated with the notification.
   * @return Reports.ThresholdInformation
   */
  public Reports.ThresholdInformation getThresholdInformation() {}

}