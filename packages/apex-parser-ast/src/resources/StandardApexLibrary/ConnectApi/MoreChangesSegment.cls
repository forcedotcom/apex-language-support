/**
 * In feed items with a large number of tracked changes, the message is formatted as: “changed A, B, and made X more changes.” The MoreChangesSegment contains the “X more changes.”
 */
global class MoreChangesSegment extends ConnectApi.MessageSegment {

  /**
   * Complete list of tracked changes.
   */
  global List < ConnectApi.FieldChangeSegment > moreChanges;

  /**
   * Number of additional changes.
   */
  global Integer moreChangesCount;

}