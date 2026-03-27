/**
 * Chatter like information.
 */
global class ChatterLike {

  /**
   * Like’s 18-character ID
   */
  global String id;

  /**
   * A reference to the liked comment or feed element.
   */
  global ConnectApi.Reference likedItem;

  /**
   * Like’s Connect REST API URL
   */
  global String url;

  /**
   * Like’s creator
   */
  global ConnectApi.UserSummary user;

}