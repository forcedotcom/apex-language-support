/**
 * If a feed element has this capability, it was created by a feed action.
 */
global class OriginCapability extends ConnectApi.FeedElementCapability {

  /**
   * The user who executed the feed action.
   */
  global ConnectApi.UserSummary actor;

  /**
   * A reference to the feed element containing the feed action.
   */
  global ConnectApi.Reference originRecord;

}