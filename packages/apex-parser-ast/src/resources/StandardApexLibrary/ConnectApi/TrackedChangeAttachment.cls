/**
 * Tracked change attachment to a feed item.
 */
global class TrackedChangeAttachment {

  global TrackedChangeAttachment() {}

  /**
   * A list of tracked changes.
   */
  global List < ConnectApi.TrackedChangeItem > changes;

  global Object clone() {}

}