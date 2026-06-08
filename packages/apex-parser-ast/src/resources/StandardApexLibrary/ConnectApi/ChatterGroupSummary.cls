/**
 * Chatter group summary.
 */
global class ChatterGroupSummary extends ConnectApi.ChatterGroup {

  global ChatterGroupSummary() {}

  /**
   * The number of files posted to the group.
   */
  global Integer fileCount;

  global Object clone() {}

}