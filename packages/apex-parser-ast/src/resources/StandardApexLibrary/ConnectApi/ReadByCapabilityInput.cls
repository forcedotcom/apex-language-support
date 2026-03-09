/**
 * Mark feed elements as read by the context user.
 */
global class ReadByCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  /**
   * Specifies to mark the feed element as read ( true ) for the context user.
   */
  global Boolean isReadByMe;

  /**
   * Specifies the last date, in ISO 8601 format, when the feed element is marked as read for the context user. If you don’t specify a date or you specify a future date, the current system date is used.
   */
  global Datetime lastReadDateByMe;

}