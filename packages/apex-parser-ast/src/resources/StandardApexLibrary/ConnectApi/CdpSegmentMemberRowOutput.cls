/**
 * Data 360 segment member row output.
 */
global class CdpSegmentMemberRowOutput {

  /**
   * Delta type, for example, new , existing , or removed .
   */
  global String deltaType;

  /**
   * Segment member ID.
   */
  global String id;

  /**
   * Fully qualified key ID.
   */
  global String kqId;

  /**
   * Type of snapshot, for example, full or incremental .
   */
  global String snapshotType;

  /**
   * Timestamp.
   */
  global String timestamp;

  /**
   * Version timestamp.
   */
  global String versionStamp;

}