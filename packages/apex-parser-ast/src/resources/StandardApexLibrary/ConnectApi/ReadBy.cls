/**
 * Information about who read the feed element and when.
 */
global class ReadBy {

  /**
   * When the user last read the feed element in ISO 8601 format.
   */
  global Datetime lastReadDateByUser;

  /**
   * Information about the user who read the feed element.
   */
  global ConnectApi.UserSummary user;

}