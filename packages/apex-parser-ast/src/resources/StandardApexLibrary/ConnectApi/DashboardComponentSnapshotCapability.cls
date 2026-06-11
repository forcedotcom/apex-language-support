/**
 * If a feed element has this capability, it has a dashboard component snapshot. A snapshot is a static image of a dashboard component at a specific point in time.
 */
global class DashboardComponentSnapshotCapability extends ConnectApi.FeedElementCapability {

  global DashboardComponentSnapshotCapability() {}

  /**
   * The dashboard component snapshot.
   */
  global ConnectApi.DashboardComponentSnapshot dashboardComponentSnapshot;

  global Object clone() {}

}