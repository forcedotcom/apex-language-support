/**
 * An article and topic assignment job.
 */
global class ArticleTopicAssignmentJobInput {

  /**
   * Type of operation to perform on articles and topics. Values are: AssignTopicsToArticle —Assign topics to articles in a data category. UnassignTopicsFromArticle —Unassign topics from articles in a data category.
   */
  global ConnectApi.ArticleTopicJobType operation;

  /**
   * List of topic names to assign to or unassign from articles.
   */
  global ConnectApi.TopicNamesInput topicNames;

}