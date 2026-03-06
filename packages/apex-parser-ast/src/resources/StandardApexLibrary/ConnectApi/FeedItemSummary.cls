/**
 * A feed item summary.
 */
global class FeedItemSummary {

  /**
   * Container for all capabilities that can be included with a feed item.
   */
  global ConnectApi.FeedElementCapabilities capabilities;

  /**
   * Title of the post. This property contains renderable plain text for all the message segments. If a client doesn’t know how to render a feed element type, it should render this text.
   */
  global ConnectApi.MessageBody header;

  /**
   * When the feed item was modified in the form of an ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime modifiedDate;

  /**
   * Reference to the original feed item if this feed item is a shared feed item; otherwise, null .
   */
  global ConnectApi.Reference originalFeedItem;

  /**
   * If this feed item is a shared feed item, information about the original poster of the feed item; otherwise, null .
   */
  global ConnectApi.Actor originalFeedItemActor;

  /**
   * URL of the photo associated with the feed item.
   */
  global String photoUrl;

  /**
   * Specifies who can see a feed item. AllUsers —Visibility is not limited to internal users. InternalUsers —Visibility is limited to internal users.
   */
  global ConnectApi.FeedItemVisibility visibility;

}