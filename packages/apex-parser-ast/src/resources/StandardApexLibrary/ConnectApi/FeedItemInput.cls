/**
 * Used to create rich feed items, for example, feed items that include @mentions or files.
 */
global class FeedItemInput extends ConnectApi.FeedElementInput {

  /**
   * Specifies the attachment for the feed item. The feed item type is inferred based on the provided attachment. Important As of API version 32.0, use the inherited capabilities property.
   */
  global ConnectApi.FeedItemAttachmentInput attachment;

  /**
   * Message body. The body can contain up to 10,000 characters and 25 mentions. Because the character limit can change, clients should make a describeSObjects() call on the FeedItem or FeedComment object and look at the length of the Body or CommentBody field to determine the maximum number of allowed characters. If you specify originalFeedElementId to share a feed item, use the body property to add the first comment to the feed item. To edit this property in a feed item, use updateFeedElement(communityId, feedElementId, feedElement) . Editing feed posts is supported in version 34.0 and later.
   */
  global ConnectApi.MessageBodyInput body;

  /**
   * Specifies if the new feed item should be bookmarked for the user ( true ) or not ( false ). Important As of API version 32.0, use the capabilities.bookmarks.isBookmarkedByCurrentUser property.
   */
  global Boolean isBookmarkedByCurrentUser;

  /**
   * To share a feed element, specify its 18-character ID. Important As of API version 39.0, use the capabilities.feedEntityShare.feedEntityId property.
   */
  global String originalFeedElementId;

  /**
   * To share a feed item, specify its 18-character ID. Important In API version 32.0–38.0, use the originalFeedElementId property. In API version 39.0 and later, use the capabilities.feedEntityShare.feedEntityId property.
   */
  global String originalFeedItemId;

  /**
   * Type of users who can see a feed item. AllUsers —Visibility is not limited to internal users. InternalUsers —Visibility is limited to internal users. Default values: For external users, the default value is AllUsers . External users must use this value to see their posts. For internal users, the default value is InternalUsers . Internal users can accept this value or use the value AllUsers to allow external users to see their posts. If the parent of the feed item is a user, group, or direct message, the visibility of the feed item must be AllUsers .
   */
  global ConnectApi.FeedItemVisibilityType Enum visibility;

}