/**
 * If a feed element has this capability, it contains all changes to a record for a single tracked change event.
 */
global class TrackedChangesCapability extends ConnectApi.FeedElementCapability {

  global TrackedChangesCapability() {}

  /**
   * Collection of feed tracked changes.
   */
  global List < ConnectApi.TrackedChangeItem > changes;

  global Object clone() {}

}