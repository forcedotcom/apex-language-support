/**
 * Pin or unpin a feed element to a feed.
 */
global class PinCapabilityInput {

  /**
   * ID of the entity to pin or unpin. In version 41.0 and later, entityId must be a feed item ID. In version 41.0–42.0, only one feed item can be pinned per feed. In version 43.0 and later, three feed items can be pinned per feed.
   */
  global String entityId;

  /**
   * Specifies whether to pin ( true ) or unpin ( false ) the entity.
   */
  global Boolean isPinned;

}