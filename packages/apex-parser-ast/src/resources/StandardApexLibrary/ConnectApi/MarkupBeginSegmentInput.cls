/**
 * The beginning tag for rich text markup.
 */
global class MarkupBeginSegmentInput extends ConnectApi.MessageSegmentInput {

  /**
   * Alternative text for the Hyperlink segment.
   */
  global String altText;

  /**
   * Type of rich text markup. Bold —Bold tag. Code —Code tag. Hyperlink —Hyperlink anchor tag. Italic —Italic tag. ListItem —List item tag. OrderedList —Ordered list tag. Paragraph —Paragraph tag. Strikethrough —Strikethrough tag. Underline —Underline tag. UnorderedList —Unordered list tag. Markup segments with a markupType of Code can include only text segments.
   */
  global ConnectApi.MarkupType markupType;

  /**
   * URL for the Hyperlink segment. Supported hyperlink URLs start with http:// or https:// .
   */
  global String url;

}