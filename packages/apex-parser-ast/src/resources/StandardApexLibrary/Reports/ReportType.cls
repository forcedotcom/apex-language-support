/**
 * Contains the unique API name and display name for the report type.
 */
global class ReportType {

  global ReportType() {}

  /**
   * Returns the localized display name of the report type.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the unique identifier of the report type.
   * @return String
   */
  global String getType() {}

  global Object clone() {}

  global void setLabel(String label) {}

  global void setType(String type) {}

}