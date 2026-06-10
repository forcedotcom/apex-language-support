/**
 * Directory of feeds and favorites.
 */
global class FeedDirectory {

  global FeedDirectory() {}

  /**
   * A list of feed favorites
   */
  global List < ConnectApi.FeedFavorite > favorites;

  /**
   * A list of feeds
   */
  global List < ConnectApi.FeedDirectoryItem > feeds;

  global Object clone() {}

}