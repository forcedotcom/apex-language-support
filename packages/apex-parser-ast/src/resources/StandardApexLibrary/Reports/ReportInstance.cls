/**
 * Returns an instance of a report that was run asynchronously. Retrieves the results for that instance.
 */
global class ReportInstance extends reports.ReportInstanceAttributes {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the date and time when the instance of the report finished running. The completion date is available only if the report instance ran successfully or couldn’t be run because of an error. Date and time information is in ISO-8601 format.
     */
    global Datetime getCompletionDate() { return null; }

    /**
     * Returns the unique ID for an instance of a report that was run asynchronously.
     */
    global Id getId() { return null; }

    /**
     * Returns the ID of the user who created the report instance.
     */
    global Id getOwnerId() { return null; }

    /**
     * Returns the unique ID of the report this instance is based on.
     */
    global Id getReportId() { return null; }

    /**
     * Retrieves results for an instance of an asynchronous report. When you request your report, you can specify whether to summarize data or include details.
     */
    global reports.ReportResults getReportResults() { return null; }

    /**
     * Returns the date and time when an instance of the report was run. Date and time information is in ISO-8601 format.
     */
    global Datetime getRequestDate() { return null; }

    /**
     * Returns the status of a report.
     * <p>Usage
     * New if the report run was recently triggered through a request.
     * Success if the report ran.
     * Running if the report is being run.
     * Error if the report run failed. The instance of a report run can return an error if, for example, your permission to access the report was removed after you requested the run.
     */
    global String getStatus() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}