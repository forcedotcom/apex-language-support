/**
 * Represents the settings for a report chart on a standard or custom page.
 */
global class ReportChartComponentLayoutItem {

  global ReportChartComponentLayoutItem() {}

  global Boolean cacheData;

  global String contextFilterableField;

  global String error;

  global Boolean hideOnError;

  global Boolean includeContext;

  global String reportName;

  global Boolean showTitle;

  global Metadata.ReportChartComponentSize size;

  /**
   * Makes a duplicate copy of the Metadata.ReportChartComponentLayoutItem .
   * @return Object
   */
  global Object clone() {}

}