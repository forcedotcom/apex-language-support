/**
 * If a feed element has this capability, it contains all the snapshotted fields of a record for a single create record event.
 */
global class RecordSnapshotCapability extends ConnectApi.FeedElementCapability {

  global RecordSnapshotCapability() {}

  /**
   * A record representation that includes metadata and data so you can display the record easily.
   */
  global ConnectApi.RecordView recordView;

  global Object clone() {}

}