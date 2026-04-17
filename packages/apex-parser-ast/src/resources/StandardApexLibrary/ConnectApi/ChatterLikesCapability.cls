/**
 * If a feed element has this capability, the context user can like it. Exposes information about existing likes.
 */
global class ChatterLikesCapability extends ConnectApi.FeedElementCapability {

  /**
   * Indicates whether the feed element is liked by the context user ( true ) or not ( false ).
   */
  global Boolean isLikedByCurrentUser;

  /**
   * Likes information for this feed element.
   */
  global ConnectApi.ChatterLikePage page;

  /**
   * A message body that describes who likes the feed element.
   */
  global ConnectApi.MessageBody likesMessage;

  /**
   * If the context user has liked the feed element, this property is a reference to the specific like, null otherwise.
   */
  global ConnectApi.Reference myLike;

}