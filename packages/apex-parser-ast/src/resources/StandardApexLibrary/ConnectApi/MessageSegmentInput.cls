/**
 * Used to add rich message segments to feed items and comments.
 */
global class MessageSegmentInput {

  /**
   * The type of message segment. Values are: EntityLink FieldChange FieldChangeName FieldChangeValue Hashtag InlineImage Link MarkupBegin MarkupEnd Mention MoreChanges ResourceLink Text
   */
  global ConnectApi.MessageSegmentType type;

}