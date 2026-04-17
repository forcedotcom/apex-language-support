/**
 * Assign topics to a feed element.
 */
global class TopicsCapabilityInput {

  /**
   * Name of the parent topic in the site to which the feed element belongs.
   */
  global String contextTopicName;

  /**
   * List of topics to assign to the feed element.
   */
  global List < String > topics;

}