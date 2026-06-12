/**
 * Topic suggestion.
 */
global class TopicSuggestion {

  global TopicSuggestion() {}

  /**
   * Topic that already exists or null for a new topic
   */
  global ConnectApi.Topic existingTopic;

  /**
   * Topic name
   */
  global String name;

  global Object clone() {}

}