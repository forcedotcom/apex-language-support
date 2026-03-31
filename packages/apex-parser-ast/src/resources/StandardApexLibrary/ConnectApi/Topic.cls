/**
 * Topic.
 */
global class Topic {

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime createdDate;

  /**
   * Description of the topic.
   */
  global String description;

  /**
   * 18-character ID.
   */
  global String id;

  /**
   * Images associated with the topic.
   */
  global ConnectApi.TopicImages images;

  /**
   * true if the topic is currently being deleted; false otherwise. After the topic is deleted, when attempting to retrieve the topic, the output is NOT_FOUND.
   */
  global Boolean isBeingDeleted;

  /**
   * Name of the topic.
   */
  global String name;

  /**
   * Non-localized name of the topic.
   */
  global String nonLocalizedName;

  /**
   * Number of people talking about this topic over the last two months, based on factors such as topic additions and comments on posts with the topic.
   */
  global Integer talkingAbout;

  /**
   * URL to the topic detail page.
   */
  global String url;

}