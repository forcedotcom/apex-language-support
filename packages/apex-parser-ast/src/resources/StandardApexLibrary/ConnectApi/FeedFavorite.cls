/**
 * Feed favorite.
 */
global class FeedFavorite {

  /**
   * Information about the Experience Cloud site that contains the favorite.
   */
  global ConnectApi.Reference community;

  /**
   * Favorite’s creator.
   */
  global ConnectApi.UserSummary createdBy;

  /**
   * Connect REST API URL identifying the feed item for this favorite.
   */
  global String feedUrl;

  /**
   * Favorite’s 18–character ID.
   */
  global String id;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime lastViewDate;

  /**
   * Favorite’s name.
   */
  global String name;

  /**
   * If the favorite is from a search, contains the search text, otherwise, an empty string.
   */
  global String searchText;

  /**
   * A reference to the topic if applicable, null otherwise.
   */
  global ConnectApi.Reference target;

  /**
   * An empty string or one of the following values: ListView Search Topic
   */
  global ConnectApi.FeedFavoriteType Enum type;

  /**
   * Connect REST API URL to this favorite.
   */
  global String url;

  /**
   * Information about the user who saved this favorite.
   */
  global ConnectApi.UserSummary user;

}