/**
 * Represents a managed topic in an Experience Cloud site.
 */
global class ManagedTopic {

  /**
   * Children managed topics of the managed topic; null if the depth request parameter isn’t specified or is 1 .
   */
  global List < ConnectApi.ManagedTopic > children;

  /**
   * ID of managed topic.
   */
  global String id;

  /**
   * Type of managed topic. Content —Topics that are associated with native content. Featured —Topics that are featured, for example, on the Experience Cloud site home page, but don’t provide overall navigation. Navigational —Topics that display in a navigational menu in the Experience Cloud site.
   */
  global ConnectApi.ManagedTopicType managedTopicType;

  /**
   * Parent managed topic of the managed topic.
   */
  global ConnectApi.Reference parent;

  /**
   * Information about the topic.
   */
  global ConnectApi.Topic topic;

  /**
   * Connect REST API URL to the managed topic.
   */
  global String url;

}