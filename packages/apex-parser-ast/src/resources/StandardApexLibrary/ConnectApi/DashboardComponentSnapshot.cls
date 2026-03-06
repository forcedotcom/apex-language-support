/**
 * Represents both dashboard component snapshots and alerts you receive when a dashboard component value crosses a threshold.
 */
global class DashboardComponentSnapshot {

  /**
   * 18-character ID of the dashboard component.
   */
  global String componentId;

  /**
   * The dashboard component name.
   */
  global String componentName;

  /**
   * Display this text next to the actor in the feed element.Use this text in place of the default body text.
   */
  global String dashboardBodyText;

  /**
   * 18-character ID of the dashboard.
   */
  global String dashboardId;

  /**
   * The name of the dashboard.
   */
  global String dashboardName;

  /**
   * The source URL to retrieve the full-size image of a snapshot. Access this URL with OAuth credentials.
   */
  global String fullSizeImageUrl;

  /**
   * ISO 8601 date specifying when this dashboard component was last refreshed.
   */
  global Datetime lastRefreshDate;

  /**
   * Display text for the last refresh date, for example, “Last Refreshed on October 31, 2013.”
   */
  global String lastRefreshDateDisplayText;

  /**
   * The running user of the dashboard at the time the snapshot was posted. This value may be null . Each dashboard has a running user, whose security settings determine which data to display in a dashboard.
   */
  global ConnectApi.UserSummary runningUser;

  /**
   * The source URL to retrieve the thumbnail image of a snapshot. Access this URL with OAuth credentials.
   */
  global String thumbnailUrl;

}