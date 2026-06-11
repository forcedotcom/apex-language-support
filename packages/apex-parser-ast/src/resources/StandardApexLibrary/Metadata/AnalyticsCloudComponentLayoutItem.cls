/**
 * Represents the settings for a Wave Analytics dashboard on a standard or custom page.
 */
global class AnalyticsCloudComponentLayoutItem {

  global AnalyticsCloudComponentLayoutItem() {}

  global String assetType;

  global String devName;

  global String error;

  global String filter;

  global Integer height;

  global Boolean hideOnError;

  global Boolean showHeader;

  global Boolean showSharing;

  global Boolean showTitle;

  global String width;

  /**
   * Makes a duplicate copy of the Metadata.AnalyticsCloudComponentLayoutItem .
   * @return Object
   */
  global Object clone() {}

}