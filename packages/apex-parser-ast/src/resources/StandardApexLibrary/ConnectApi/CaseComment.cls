/**
 * Attachments in feed items with type CaseCommentPost .
 */
global class CaseComment {

  /**
   * Type of user who made the comment. Customer —if a Chatter customer made the comment CustomerService —if a service representative made the comment
   */
  global ConnectApi.CaseActorType Enum actorType;

  /**
   * Comment’s creator
   */
  global ConnectApi.UserSummary createdBy;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z
   */
  global Datetime createdDate;

  /**
   * Comment’s 18–character ID
   */
  global String id;

  /**
   * Specifies whether the comment has been published
   */
  global Boolean published;

  /**
   * Comment’s text
   */
  global String text;

}