/**
 * Represents the settings for a report chart on a standard or custom page.
 */
global class ReportChartComponentLayoutItem {

  global ReportChartComponentLayoutItem() {}

  public Boolean cacheData;

  public String contextFilterableField;

  public String error;

  public Boolean hideOnError;

  public Boolean includeContext;

  public String reportName;

  public Boolean showTitle;

  public Metadata.ReportChartComponentSize size;

  /**
   * Makes a duplicate copy of the Metadata.ReportChartComponentLayoutItem .
   * @return Object
   */
  public Object clone() {}

}