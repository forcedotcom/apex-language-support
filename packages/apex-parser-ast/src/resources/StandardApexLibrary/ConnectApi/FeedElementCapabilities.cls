/**
 * A container for all capabilities that can be included with a feed element.
 */
global class FeedElementCapabilities {

  /**
   * If a feed element has this capability, it includes information about an approval.
   */
  global ConnectApi.ApprovalCapability approval;

  /**
   * If a feed element has this capability, it has platform actions associated with it.
   */
  global ConnectApi.AssociatedActionsCapability associatedActions;

  /**
   * If a feed element has this capability, it has a banner motif and style.
   */
  global ConnectApi.BannerCapability banner;

  /**
   * If a feed element has this capability, the context user can bookmark it.
   */
  global ConnectApi.BookmarksCapability bookmarks;

  /**
   * If a feed element has this capability, it has a container of feed elements called a bundle .
   */
  global ConnectApi.BundleCapability bundle;

  /**
   * If a feed element has this capability, it has a recording comment.
   */
  global ConnectApi.CallCollaborationCapability callCollaboration;

  /**
   * If a feed element has this capability, it renders a canvas app.
   */
  global ConnectApi.CanvasCapability canvas;

  /**
   * If a feed element has this capability, it has a case comment on the case feed.
   */
  global ConnectApi.CaseCommentCapability caseComment;

  /**
   * If a feed element has this capability, the context user can like it. Exposes information about existing likes.
   */
  global ConnectApi.ChatterLikesCapability chatterLikes;

  /**
   * If a feed element has this capability, users with permission can close it.
   */
  global ConnectApi.CloseCapability close;

  /**
   * If a feed element or comment has this capability, the context user can add a comment to it.
   */
  global ConnectApi.CommentsCapability comments;

  /**
   * If a comment has this capability, it has a file attachment. Most ConnectApi.ContentCapability properties are null if the content has been deleted from the feed element or if the access has changed to private. Important In version 36.0 and later, use the files property.
   */
  global ConnectApi.ContentCapability content;

  /**
   * If a feed element has this capability, it has a dashboard component snapshot. A snapshot is a static image of a dashboard component at a specific point in time.
   */
  global ConnectApi.DashboardComponentSnapshotCapability dashboardComponentSnapshot;

  /**
   * If a feed element has this capability, it’s a direct message.
   */
  global ConnectApi.DirectMessageCapability directMessage;

  /**
   * If a feed element has this capability, users who have permission can edit it.
   */
  global ConnectApi.EditCapability edit;

  /**
   * If a feed element has this capability, it has an email message from a case.
   */
  global ConnectApi.EmailMessageCapability emailMessage;

  /**
   * If a feed element has this capability, it has a link that may contain supplemental information like an icon, a title, and a description.
   */
  global ConnectApi.EnhancedLinkCapability enhancedLink;

  /**
   * If a feed element has this capability, it has one or more extension attachments.
   */
  global ConnectApi.ExtensionsCapability extensions;

  /**
   * If a feed element or comment has this capability, a feed entity is shared with it.
   */
  global ConnectApi.FeedShareCapability feedEntityShare;

  /**
   * If a feed element has this capability, it has one or more file attachments.
   */
  global ConnectApi.FilesCapability files;

  /**
   * If a feed element has this capability, it has information about user interactions.
   */
  global ConnectApi.InteractionsCapability interactions;

  /**
   * If a feed element has this capability, it has a link.
   */
  global ConnectApi.LinkCapability link;

  /**
   * If a feed element has this capability, it has one or more media references.
   */
  global ConnectApi.MediaReferenceCapability mediaReferences;

  /**
   * If a feed element has this capability, users in an Experience Cloud site can flag it for moderation.
   */
  global ConnectApi.ModerationCapability moderation;

  /**
   * If a feed element has this capability, users can mute it.
   */
  global ConnectApi.MuteCapability mute;

  /**
   * If a feed element has this capability, it was created by a feed action.
   */
  global ConnectApi.OriginCapability origin;

  /**
   * If a feed element has this capability, users who have permission can pin it to a feed.
   */
  global ConnectApi.PinCapability pin;

  /**
   * If a feed element has this capability, it includes a poll.
   */
  global ConnectApi.PollCapability poll;

  /**
   * If a feed element has this capability, it has a question and comments on the feed element are answers to the question.
   */
  global ConnectApi.QuestionAndAnswersCapability questionAndAnswers;

  /**
   * If a feed element has this capability, the context user can mark it as read.
   */
  global ConnectApi.ReadByCapability readBy;

  /**
   * If a feed element has this capability, it has a recommendation.
   */
  global ConnectApi.RecommendationsCapability recommendations;

  /**
   * If a feed element has this capability, it contains all the snapshotted fields of a record for a single create record event.
   */
  global ConnectApi.RecordSnapshotCapability recordSnaphot;

  /**
   * If a feed element has this capability, it can interact with a social post on a social network.
   */
  global ConnectApi.SocialPostCapability socialPost;

  /**
   * If a feed post or comment has this capability, it has a status that determines its visibility.
   */
  global ConnectApi.StatusCapability status;

  /**
   * If a feed element has this capability, the context user can add topics to it. Topics help users organize and discover conversations.
   */
  global ConnectApi.TopicsCapability topics;

  /**
   * If a feed element has this capability, it contains all changes to a record for a single tracked change event.
   */
  global ConnectApi.TrackedChangesCapability trackedChanges;

  /**
   * If a feed post or comment has this capability, users can upvote or downvote it.
   */
  global ConnectApi.UpDownVoteCapability upDownVote;

}