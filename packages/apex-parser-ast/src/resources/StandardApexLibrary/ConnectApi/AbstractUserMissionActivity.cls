/**
 * User activity associated with missions.
 */
global class AbstractUserMissionActivity {

  /**
   * Number of mission activities of the specified type for the user.
   */
  global Integer activityCount;

  /**
   * Type of mission activity for a user. Values are: FeedItemAnswerAQuestion —User answered a question. FeedItemLikeSomething —User liked a post or comment. FeedItemMarkAnswerAsBest —User marked an answer as the best answer. FeedItemPostQuestion —User posted a question. FeedItemReceiveAComment —User received a comment on a post. FeedItemReceiveALike —User received a like on a post or comment. FeedItemReceiveAnAnswer —User received an answer to a question. FeedItemWriteAComment —User commented on a post. FeedItemWriteAPost —User made a post. FeedItemYourAnswerMarkedBest —User’s answer was marked as the best answer.
   */
  global String activityType;

}