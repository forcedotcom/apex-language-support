/**
 * Chatter favorites give you easy access to topics, list views, and feed searches.
 */
global class ChatterFavorites {

  public static ConnectApi.FeedFavorite addFavorite(String communityId, String subjectId, String searchText) {}

  public static ConnectApi.FeedFavorite addRecordFavorite(String communityId, String subjectId, String targetId) {}

  public static void deleteFavorite(String communityId, String subjectId, String favoriteId) {}

  public static ConnectApi.FeedFavorite getFavorite(String communityId, String subjectId, String favoriteId) {}

  public static ConnectApi.FeedFavorites getFavorites(String communityId, String subjectId) {}

  public static ConnectApi.FeedElementPage getFeedElements(String communityId, String subjectId, String favoriteId) {}

  public static ConnectApi.FeedElementPage getFeedElements(String communityId, String subjectId, String favoriteId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedElementPage getFeedElements(String communityId, String subjectId, String favoriteId, Integer recentCommentCount, Integer elementsPerBundle, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedFavorite updateFavorite(String communityId, String subjectId, String favoriteId, Boolean updateLastViewDate) {}

  public static void setTestGetFeedElements(String communityId, String subjectId, String favoriteId, ConnectApi.FeedElementPage result) {}

  public static void setTestGetFeedElements(String communityId, String subjectId, String favoriteId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static void setTestGetFeedElements(String communityId, String subjectId, String favoriteId, Integer recentCommentCount, Integer elementsPerBundle, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam, ConnectApi.FeedElementPage result) {}

  public static ConnectApi.FeedItemPage getFeedItems(String communityId, String subjectId, String favoriteId) {}

  public static ConnectApi.FeedItemPage getFeedItems(String communityId, String subjectId, String favoriteId, String pageParam, Integer pageSize, ConnectApi.FeedSortOrder sortParam) {}

  public static ConnectApi.FeedItemPage getFeedItems(String communityId, String subjectId, String favoriteId, Integer recentCommentCount, String pageParam, Integer pageSize, FeedSortOrder sortParam) {}

  public static void setTestGetFeedItems(String communityId, String subjectId, String favoriteId, ConnectApi.FeedItemPage result) {}

  public static void setTestGetFeedItems(String communityId, String subjectId, String favoriteId, String pageParam, Integer pageSize, FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

  public static void setTestGetFeedItems(String communityId, String subjectId, String favoriteId, Integer recentCommentCount, String pageParam, Integer pageSize, FeedSortOrder sortParam, ConnectApi.FeedItemPage result) {}

}