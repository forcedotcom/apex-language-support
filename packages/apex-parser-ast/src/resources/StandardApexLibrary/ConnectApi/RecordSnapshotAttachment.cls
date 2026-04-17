/**
 * Fields of a record at the point in time when the record was created.
 */
global class RecordSnapshotAttachment extends ConnectApi.FeedItemAttachment {

  /**
   * The representation of the record.
   */
  global ConnectApi.RecordView recordView;

}