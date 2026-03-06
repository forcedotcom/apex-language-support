/**
 * A list of topic names to replace currently assigned topics. Also a list of suggested topics to assign.
 */
global class TopicNamesInput {

  /**
   * A list of up to 10 topic names for a feed item or 100 topic names for a record.
   */
  global List < String > topicNames;

  /**
   * A list of suggested topics to assign to a record or feed item to improve future topic suggestions.
   */
  global List < String > topicSuggestions;

}