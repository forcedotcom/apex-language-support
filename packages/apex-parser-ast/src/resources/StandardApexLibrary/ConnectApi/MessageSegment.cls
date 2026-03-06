/**
 * Message segment.
 */
global class MessageSegment {

  /**
   * Text-only rendition of this segment. If a client encounters an unknown message segment type, it can render this value.
   */
  global String text;

  /**
   * The message segment type. One of these values: EntityLink FieldChange FieldChangeName FieldChangeValue Hashtag InlineImage Link MarkupBegin MarkupEnd Mention MoreChanges ResourceLink Text
   */
  global ConnectApi.MessageSegmentType Enum type;

}