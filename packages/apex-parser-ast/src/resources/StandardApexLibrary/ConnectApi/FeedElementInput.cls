/**
 * Feed elements are the top-level items that a feed contains. Feeds are feed element containers.
 */
global class FeedElementInput {

  /**
   * The capabilities that define auxiliary information on this feed element.
   */
  global ConnectApi.FeedElementCapabilitiesInput capabilities;

  /**
   * The type of feed element this input represents.
   */
  global ConnectApi.FeedElementType feedElementType;

  /**
   * The ID of the parent this feed element is being posted to. This value can be the ID of a user, group, or record, or the string me to indicate the context user. In version 45.0 and later, you can move a feed element from one public group to another by setting this property to the ID of the new public group. You can’t include or change any other properties when moving a feed element.
   */
  global String subjectId;

}