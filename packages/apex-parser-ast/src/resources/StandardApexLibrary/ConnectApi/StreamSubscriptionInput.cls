/**
 * An entity to subscribe to for a Chatter feed stream.
 */
global class StreamSubscriptionInput {

  /**
   * The ID of any feed-enabled entity, such as a group, record, or user, that the context user can access. When subscribed, the entity’s feed is included in the feed stream.
   */
  global String entityId;

}