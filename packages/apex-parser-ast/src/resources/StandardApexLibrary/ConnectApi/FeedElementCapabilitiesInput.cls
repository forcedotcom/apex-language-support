/**
 * A container for all capabilities that can be included when creating a feed element.
 */
global class FeedElementCapabilitiesInput {

  /**
   * Describes actions added to the feed element.
   */
  global ConnectApi.AssociatedActionsCapabilityInput associatedActions;

  /**
   * Describes bookmarks added to the feed element.
   */
  global ConnectApi.BookmarksCapabilityInput bookmarks;

  /**
   * Describes a canvas app added to the feed element.
   */
  global ConnectApi.CanvasCapabilityInput canvas;

  /**
   * Describes content added to the feed element. Important This class isn’t available for feed posts in version 36.0 and later. In version 36.0 and later, use ConnectApi.FilesCapabilityInput .
   */
  global ConnectApi.ContentCapabilityInput content;

  /**
   * Describes the direct message.
   */
  global ConnectApi.DirectMessageCapabilityInput directMessage;

  /**
   * Describes the extensions associated with the feed element.
   */
  global ConnectApi.ExtensionsCapabilityInput extensions;

  /**
   * Describes the feed entity shared with the feed element.
   */
  global ConnectApi.FeedEntityShareCapabilityInput feedEntityShare;

  /**
   * Describes files attached to the feed element.
   */
  global ConnectApi.FilesCapabilityInput files;

  /**
   * Describes a link added to the feed element.
   */
  global ConnectApi.LinkCapabilityInput link;

  /**
   * Describes a poll added to the feed element.
   */
  global ConnectApi.PollCapabilityInput poll;

  /**
   * Describes a question and answer capability added to the feed element.
   */
  global ConnectApi.QuestionAndAnswersCapabilityInput questionAndAnswers;

  /**
   * Describes the status of the feed element.
   */
  global ConnectApi.StatusCapabilityInput status;

  /**
   * Describes topics assigned to the feed element.
   */
  global ConnectApi.TopicsCapabilityInput topics;

}