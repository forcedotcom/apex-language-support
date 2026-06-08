/**
 * Hashtag segment.
 */
global class HashtagSegment extends ConnectApi.MessageSegment {

  global HashtagSegment() {}

  /**
   * Text of the topic without the hash symbol (#).
   */
  global String tag;

  /**
   * Connect REST API Topics resource that searches for the topic: /services/data/v67.0/chatter/topics?exactMatch= true &q= topic
   */
  global String topicUrl;

  /**
   * Connect REST API Feed Items resource URL that searches for the topic in all feed items in an organization: /services/data/v67.0/chatter/feed-items?q= topic
   */
  global String url;

  global Object clone() {}

}