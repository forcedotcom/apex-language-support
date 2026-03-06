/**
 * If a feed element has this capability, users who have permission can pin it to a feed.
 */
global class PinCapability {

  /**
   * Specifies whether the context user can pin or unpin the entity to the feed ( true ) or not ( false ).
   */
  global Boolean isPinnableByMe;

  /**
   * Specifies whether the entity is pinned ( true ) or not pinned ( false ) to the feed.
   */
  global Boolean isPinned;

}