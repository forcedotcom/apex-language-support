/**
 * A page of upvotes or downvotes on a feed element or comment.
 */
global class VotePage {

  /**
   * Token identifying the current page.
   */
  global Integer currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Collection of users and their upvotes or downvotes. Upvotes include likes and upvotes. For example, if a post receives five likes and three upvotes, the number of upvotes is eight. For this reason, the collection of users and their upvotes also includes users who liked the post or comment. If a user both liked and upvoted a post, they appear only once in the collection.
   */
  global List < ConnectApi.Vote > items;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global Integer nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page, or null if there isn’t a previous page.
   */
  global Integer previousPageToken;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of upvotes or downvotes for the feed element or comment. The number of upvotes includes the number of likes and upvotes. For example, if a post receives five likes and three upvotes, the total number of upvotes is eight. If a user both liked and upvoted a post, we count that as two upvotes.
   */
  global Long total;

}