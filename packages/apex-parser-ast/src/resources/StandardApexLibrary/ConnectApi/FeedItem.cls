/**
 * Feed item.
 */
global class FeedItem extends ConnectApi.FeedElement Class {

  /**
   * The entity that created the feed item.
   */
  global ConnectApi.Actor actor;

  /**
   * Information about the attachment. If there is no attachment, returns null . Important As of version 32.0, use the inherited capabilities property.
   */
  global ConnectApi.FeedItemAttachment attachment;

  /**
   * Indicates whether the feed item can be shared. If a feed item has multiple file attachments and at least one attachment has been deleted or is inaccessible, the feed item can’t be shared. The canShare value is incorrectly set to true in these cases. Important As of version 39.0, use the isSharable property.
   */
  global Boolean canShare;

  /**
   * Information about the connected app used to authenticate the connection.
   */
  global ConnectApi.ClientInfo clientInfo;

  /**
   * First page of comments for this feed item. Important As of version 32.0, use the inherited capabilities.comments.page property.
   */
  global ConnectApi.CommentPage comments;

  /**
   * true if feed item is created due to an event change, false otherwise.
   */
  global Boolean event;

  /**
   * true if the feed item has a verified comment, otherwise false .
   */
  global Boolean hasVerifiedComment;

  /**
   * true if the context user has bookmarked this feed item, otherwise, false . Important As of version 32.0, use the inherited capabilities.bookmarks.isBookmarkedByCurrentUser property.
   */
  global Boolean isBookmarkedByCurrentUser;

  /**
   * If this property is true the comment cannot be deleted by the context user. If it is false , it might be possible for the context user to delete the comment, but it is not guaranteed.
   */
  global Boolean isDeleteRestricted;

  /**
   * true if the context user has liked this feed item, otherwise, false . Important As of version 32.0, use the inherited capabilities.chatterLikes.isLikedByCurrentUser property.
   */
  global Boolean isLikedByCurrentUser;

  /**
   * Indicates whether the feed item can be shared.
   */
  global Boolean isSharable;

  /**
   * First page of likes for this feed item. Important As of version 32.0, use the inherited capabilities.chatterLikes.page property.
   */
  global ConnectApi.ChatterLikePage likes;

  /**
   * A message body the describes who likes the feed item. Important As of version 32.0, use the inherited capabilities.chatterLikes.likesMessage property.
   */
  global ConnectApi.MessageBody likesMessage;

  /**
   * Information about the moderation flags on a feed item. If ConnectApi.Features.communityModeration is false , this property is null . Important As of version 31.0, use the inherited capabilities.moderation.moderationFlags property.
   */
  global ConnectApi.ModerationFlags moderationFlags;

  /**
   * If the context user has liked the feed item, this property is a reference to the specific like, otherwise, null . Important As of version 32.0, use the inherited capabilities.chatterLikes.myLike property.
   */
  global ConnectApi.Reference myLike;

  /**
   * A reference to the original feed item if this feed item is a shared feed item, otherwise, null .
   */
  global ConnectApi.Reference originalFeedItem;

  /**
   * If this feed item is a shared feed item, returns information about the original poster of the feed item, otherwise, returns null .
   */
  global ConnectApi.Actor originalFeedItemActor;

  /**
   * URL of the photo associated with the feed item
   */
  global String photoUrl;

  /**
   * A collection of message segments, including the unformatted text of the message that you can use as the title of a feed item. Message segments include name, link, and motif icon information for the actor that created the feed item. Important For API versions 29.0 and 30.0, use the ConnectApi.FeedItem.preamble.text property as the default case to render text. For API versions 31.0 and later, use the ConnectApi.FeedElement.header.text property as the default case to render text.
   */
  global ConnectApi.MessageBody preamble;

  /**
   * Topics for this feed item. Important As of version 31.0, use the inherited capabilities.topics.items property.
   */
  global ConnectApi.FeedItemTopicPage topics;

  /**
   * Type of feed item. Important As of API version 32.0, use the capabilities property to determine what can be done with a feed item. See Working with Feeds and Feed Elements . One of these values: ActivityEvent —Feed item generated in Case Feed when an event or task associated with a parent record with a feed enabled is created or updated. AdvancedTextPost —A feed item with advanced text formatting, such as a group announcement post. ApprovalPost —Feed item with an approval capability. Approvers can act on the feed item parent. AttachArticleEvent —Feed item generated when an article is attached to a case in Case Feed. BasicTemplateFeedItem —Feed item with an enhanced link capability. CallLogPost —Feed item generated when a call log is saved to a case in Case Feed. CanvasPost —Feed item generated by a canvas app in the publisher or from Connect REST API or Connect in Apex. The post itself is a link to a canvas app. CaseCommentPost —Feed item generated when a case comment is saved in Case Feed. ChangeStatusPost —Feed item generated when the status of a case is changed in Case Feed. ChatTranscriptionPost —Feed item generated in Case Feed when a Live Agent chat transcript is saved to a case. CollaborationGroupCreated —Feed item generated when a new public group is created. Contains a link to the new group. CollaborationGroupUnarchived —Deprecated. Feed item generated when an archived group is activated. ContentPost —Feed item with a content capability. CreateRecordEvent —Feed item that describes a record created in the publisher. DashboardComponentAlert —Feed item with a dashboard alert. DashboardComponentSnapshot —Feed item with a dashboard component snapshot capability. EmailMessageEvent —Feed item generated when an email is sent from a case in Case Feed. FacebookPost —Deprecated. Feed item generated when a Facebook post is created from a case in Case Feed. LinkPost —Feed item with a link capability. MilestoneEvent —Feed item generated when a case milestone is either completed or reaches a violation status. Contains a link to the case milestone. PollPost —Feed item with a poll capability. Viewers of the feed item are allowed to vote on the options in the poll. ProfileSkillPost —Feed item generated when a skill is added to a user’s profile. QuestionPost —Feed item generated when a question is asked. As of API version 33.0, a feed item of this type can have a content capability and a link capability. ReplyPost —Feed item generated by a Chatter Answers reply. RypplePost —Feed item generated when a user posts thanks. SocialPost —Feed item generated when a social post is created from a case in Case Feed. TextPost —Feed item containing text only. TrackedChange —Feed item created when one or more fields on a record have been changed. UserStatus —Deprecated. A user's post to their own profile.
   */
  global ConnectApi.FeedItemType type;

  /**
   * Type of users who can see a feed item. AllUsers —Visibility is not limited to internal users. InternalUsers —Visibility is limited to internal users.
   */
  global ConnectApi.FeedItemVisibilityType visibility;

}