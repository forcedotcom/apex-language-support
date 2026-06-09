/**
 * Information about categories of fields in a report type.
 */
global class ReportTypeColumnCategory {

  global ReportTypeColumnCategory() {}

  /**
   * Returns information for all fields in the report type. The information is organized by each section’s unique API name.
   * @return Map<String,Reports.ReportTypeColumn>
   */
  global Map<String,Reports.ReportTypeColumn> getColumns() {}

  /**
   * Returns the localized display name of a section in the report type under which fields are organized. For example, in an Accounts with Contacts custom report type, Account General is the display name of the section that contains fields on general account information.
   * @return String
   */
  global String getLabel() {}

  global Object clone() {}

}