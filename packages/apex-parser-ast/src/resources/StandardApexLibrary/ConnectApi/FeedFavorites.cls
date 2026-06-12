/**
 * Feed favorites.
 */
global class FeedFavorites {

  global FeedFavorites() {}

  /**
   * Complete list of favorites.
   */
  global List < ConnectApi.FeedFavorite > favorites;

  /**
   * Total number of favorites.
   */
  global Integer total;

  global Object clone() {}

}