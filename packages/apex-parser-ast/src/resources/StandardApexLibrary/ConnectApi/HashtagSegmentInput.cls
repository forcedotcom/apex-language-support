/**
 * Include a hashtag in a feed item or comment.
 */
global class HashtagSegmentInput {

  /**
   * Text of the hash tag without the # (hash tag) prefix Note Closing square brackets ( ] ) are not supported in hash tag text. If the text contains a closing square bracket ( ] ), the hash tag ends at the bracket.
   */
  global String tag;

}