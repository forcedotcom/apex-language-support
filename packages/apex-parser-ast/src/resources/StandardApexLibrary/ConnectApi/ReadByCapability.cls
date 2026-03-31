/**
 * If a feed element has this capability, the context user can mark it as read.
 */
global class ReadByCapability extends ConnectApi.FeedElementCapability {

  /**
   * Specifies whether the feed element has been read ( true ) or not ( false ) by the context user.
   */
  global Boolean isReadByMe;

  /**
   * Last date when the feed element was marked read for the context user in ISO 8601 format. Otherwise, null .
   */
  global Datetime lastReadDateByMe;

  /**
   * First page of information about who read the feed element and when.
   */
  global ConnectApi.ReadByPage page;

}