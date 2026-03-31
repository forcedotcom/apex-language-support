/**
 * The end of rich text markup.
 */
global class MarkupEndSegment extends ConnectApi.MessageSegment {

  /**
   * The HTML tag for this markup.
   */
  global String htmlTag;

  /**
   * Type of rich text markup. Bold —Bold tag. Code —Code tag. Hyperlink —Hyperlink anchor tag. Italic —Italic tag. ListItem —List item tag. OrderedList —Ordered list tag. Paragraph —Paragraph tag. Strikethrough —Strikethrough tag. Underline —Underline tag. UnorderedList —Unordered list tag.
   */
  global ConnectApi.MarkupType markupType;

}