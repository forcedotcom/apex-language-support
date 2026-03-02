/**
 * Get information about trending articles in Experience Cloud sites.
 */
public class Knowledge {

  public static ConnectApi.KnowledgeArticleVersionCollection getTopViewedArticlesForTopic(String communityId, String topicId, Integer maxResults) {}

  public static ConnectApi.KnowledgeArticleVersionCollection getTrendingArticles(String communityId, Integer maxResults) {}

  public static ConnectApi.KnowledgeArticleVersionCollection getTrendingArticlesForTopic(String communityId, String topicId, Integer maxResults) {}

  public static Void setTestGetTrendingArticles(String communityId, Integer maxResults, ConnectApi.KnowledgeArticleVersionCollection result) {}

  public static Void setTestGetTrendingArticlesForTopic(String communityId, String topicId, Integer maxResults, ConnectApi.KnowledgeArticleVersionCollection result) {}

}