/**
 * Contains information about the report instance and condition threshold for a report notification.
 */
global class NotificationActionContext {
    /**
     * Creates a new instance of the Reports.NotificationActionContext class using the specified parameters.
     */
    global Object NotificationActionContext(reports.ReportInstance reportInstance, reports.ThresholdInformation thresholdInformation) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the report instance associated with the notification.
     */
    global reports.ReportInstance getReportInstance() { return null; }

    /**
     * Returns the threshold information associated with the notification.
     */
    global reports.ThresholdInformation getThresholdInformation() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}