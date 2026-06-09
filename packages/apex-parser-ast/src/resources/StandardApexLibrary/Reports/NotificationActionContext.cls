/**
 * Contains information about the report instance and condition threshold for a report notification.
 */
global class NotificationActionContext {

  global NotificationActionContext(Reports.ReportInstance reportInstance, Reports.ThresholdInformation thresholdInformation) {}

  /**
   * Returns the report instance associated with the notification.
   * @return Reports.ReportInstance
   */
  global Reports.ReportInstance getReportInstance() {}

  /**
   * Returns the threshold information associated with the notification.
   * @return Reports.ThresholdInformation
   */
  global Reports.ThresholdInformation getThresholdInformation() {}

  global Object clone() {}

}