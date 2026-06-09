/**
 * Returns an instance of a report that was run asynchronously. Retrieves the results for that instance.
 */
global class ReportInstance {

  global ReportInstance() {}

  /**
   * Returns the date and time when the instance of the report finished running. The completion date is available only if the report instance ran successfully or couldn’t be run because of an error. Date and time information is in ISO-8601 format.
   * @return Datetime
   */
  global Datetime getCompletionDate() {}

  /**
   * Returns the unique ID for an instance of a report that was run asynchronously.
   * @return Id
   */
  global Id getId() {}

  /**
   * Returns the ID of the user who created the report instance.
   * @return Id
   */
  global Id getOwnerId() {}

  /**
   * Returns the unique ID of the report this instance is based on.
   * @return Id
   */
  global Id getReportId() {}

  /**
   * Retrieves results for an instance of an asynchronous report. When you request your report, you can specify whether to summarize data or include details.
   * @return Reports.ReportResults
   */
  global Reports.ReportResults getReportResults() {}

  /**
   * Returns the date and time when an instance of the report was run. Date and time information is in ISO-8601 format.
   * @return Datetime
   */
  global Datetime getRequestDate() {}

  /**
   * Returns the status of a report.
   * @return String
   */
  global String getStatus() {}

  global Object clone() {}

}