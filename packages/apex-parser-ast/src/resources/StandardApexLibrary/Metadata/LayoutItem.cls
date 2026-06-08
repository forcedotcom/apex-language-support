/**
 * Represents the valid values that define a layout item.
 */
global class LayoutItem {

  global LayoutItem() {}

  public Metadata.AnalyticsCloudComponentLayoutItem analyticsCloudComponent;

  public Metadata.UiBehavior behavior;

  public String canvas;

  public String component;

  public String customLink;

  public Boolean emptySpace;

  public String field;

  public Integer height;

  public String page_x;

  public Metadata.ReportChartComponentLayoutItem reportChartComponent;

  public String scontrol;

  public Boolean showLabel;

  public Boolean showScrollbars;

  public String width;

  /**
   * Makes a duplicate copy of the Metadata.LayoutItem .
   * @return Object
   */
  public Object clone() {}

}