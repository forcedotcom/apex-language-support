/**
 * Attachments in feed items with type DashboardSnapshot .
 */
global class DashboardComponentAttachment {

  /**
   * Component’s 18–character ID.
   */
  global String componentId;

  /**
   * Name of the component. If no name is saved with the component, returns the localized string, “Untitled Component.”.
   */
  global String componentName;

  /**
   * Text displayed next to the actor in the body of a feed item. This is used instead of the default body text. If no text is specified, and there is no default body text, returns null.
   */
  global String dashboardBodyText;

  /**
   * Dashboard’s 18–character ID.
   */
  global String dashboardId;

  /**
   * Name of the dashboard.
   */
  global String dashboardName;

  /**
   * URL of the full-sized dashboard image.
   */
  global String fullSizeImageUrl;

  /**
   * ISO8601 date string, for example, 2011-02-25T18:24:31.000Z, specifying when this dashboard was last refreshed.
   */
  global Datetime lastRefreshDate;

  /**
   * The text of the last refresh date to be displayed, such as, “Last refreshed on October 31, 2011.”
   */
  global String lastRefreshDateDisplayText;

  /**
   * The user running the dashboard.
   */
  global ConnectApi.UserSummary runningUser;

  /**
   * URL of the thumbnail-sized dashboard image.
   */
  global String thumbnailUrl;

}