/**
 * Update a topic’s name or description or merge topics.
 */
global class TopicInput {

  /**
   * Description of the topic
   */
  global String description;

  /**
   * List of up to five secondary topic IDs to merge with the primary topic If any of the secondary topics are navigational or featured topics, they lose their topic type, topic images, and children topics. Their feed items are reassigned to the primary topic. If you merge a topic with a content topic, the content associations are preserved. If you merge a topic with an inactive endorsee, the endorsement isn’t mapped to the primary topic.
   */
  global List < String > idsToMerge;

  /**
   * Name of the topic Use this property to change only the capitalization and spacing of the topic name.
   */
  global String name;

}