/**
 * Get information about trending articles in Experience Cloud sites.
 */
global class Knowledge {

  global Knowledge() {}

  global static ConnectApi.KnowledgeArticleVersionCollection getTopViewedArticlesForTopic(String communityId, String topicId, Integer maxResults) {}

  global static ConnectApi.KnowledgeArticleVersionCollection getTrendingArticles(String communityId, Integer maxResults) {}

  global static ConnectApi.KnowledgeArticleVersionCollection getTrendingArticlesForTopic(String communityId, String topicId, Integer maxResults) {}

  global static void setTestGetTrendingArticles(String communityId, Integer maxResults, ConnectApi.KnowledgeArticleVersionCollection result) {}

  global static void setTestGetTrendingArticlesForTopic(String communityId, String topicId, Integer maxResults, ConnectApi.KnowledgeArticleVersionCollection result) {}

  global Object clone() {}

}