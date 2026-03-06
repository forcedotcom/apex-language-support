/**
 * Represents one user endorsing another user for a single topic.
 */
global class TopicEndorsement {

  /**
   * User being endorsed.
   */
  global ConnectApi.UserSummary endorsee;

  /**
   * 18-character ID of the endorsement record.
   */
  global String endorsementId;

  /**
   * User performing the endorsement.
   */
  global ConnectApi.UserSummary endorser;

  /**
   * Topic the user is being endorsed for.
   */
  global ConnectApi.Topic topic;

  /**
   * URL to the resource for the endorsement record.
   */
  global String url;

}