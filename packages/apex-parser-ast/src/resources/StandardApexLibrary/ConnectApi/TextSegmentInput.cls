/**
 * Include a text segment in a feed item or comment.
 */
global class TextSegmentInput {

  /**
   * Plain text for this segment. If hashtags or links are detected in text , they’re included in the comment as hashtag and link segments. Mentions aren’t detected in text and aren’t separated out of the text. Mentions require ConnectApi.MentionSegmentInput .
   */
  global String text;

}