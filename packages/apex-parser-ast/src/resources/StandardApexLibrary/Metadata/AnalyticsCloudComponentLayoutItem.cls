/**
 * Represents the settings for a Wave Analytics dashboard on a standard or custom page.
 */
global class AnalyticsCloudComponentLayoutItem {

  global AnalyticsCloudComponentLayoutItem() {}

  public String assetType;

  public String devName;

  public String error;

  public String filter;

  public Integer height;

  public Boolean hideOnError;

  public Boolean showHeader;

  public Boolean showSharing;

  public Boolean showTitle;

  public String width;

  /**
   * Makes a duplicate copy of the Metadata.AnalyticsCloudComponentLayoutItem .
   * @return Object
   */
  public Object clone() {}

}