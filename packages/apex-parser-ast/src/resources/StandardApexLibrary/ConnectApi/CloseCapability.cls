/**
 * If a feed element has this capability, users with permission can close it.
 */
global class CloseCapability {

  /**
   * Specifies whether the context user has permission to set the feed element to closed ( true ) or not ( false ).
   */
  global Boolean canContextUserUpdateIsClosed;

  /**
   * Specifies whether the feed element is closed ( true ) or not ( false ).
   */
  global Boolean isClosed;

}