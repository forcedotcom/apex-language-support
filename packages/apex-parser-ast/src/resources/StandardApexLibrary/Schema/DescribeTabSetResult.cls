/**
 * Contains metadata information about a Salesforce Classic standard or custom app available in the Salesforce user interface.
 */
global class DescribeTabSetResult {

  global DescribeTabSetResult() {}

  /**
   * Returns the display description for the standard or custom app.
   * @return String
   */
  global String getDescription() {}

  /**
   * Returns the display label for the standard or custom app.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns a fully qualified URL to the logo image associated with the standard or custom app.
   * @return String
   */
  global String getLogoUrl() {}

  /**
   * Returns the developer namespace prefix of a Salesforce AppExchange managed package.
   * @return String
   */
  global String getNamespace() {}

  /**
   * Returns metadata information about the standard or custom app’s displayed tabs.
   * @return List<Schema.DescribeTabResult>
   */
  global List<Schema.DescribeTabResult> getTabs() {}

  global Boolean isSelected() {}

  global String getTabSetId() {}

  global Object clone() {}

}