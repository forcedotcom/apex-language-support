/**
 * If a comment has this capability, it has a record attachment.
 */
global class RecordCapability extends ConnectApi.FeedElementCapability {

  global RecordCapability() {}

  /**
   * ID of the record.
   */
  global String recordId;

  /**
   * URL to the record.
   */
  global String url;

  global Object clone() {}

}