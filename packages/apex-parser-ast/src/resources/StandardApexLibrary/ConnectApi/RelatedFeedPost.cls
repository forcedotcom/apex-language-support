/**
 * This class is abstract.
 */
global class RelatedFeedPost extends ConnectApi.ActorWithId {

  /**
   * Score of the related feed post that indicates how closely related it is to the context feed post.
   */
  global Double score;

  /**
   * Title of the related feed post.
   */
  global String title;

}