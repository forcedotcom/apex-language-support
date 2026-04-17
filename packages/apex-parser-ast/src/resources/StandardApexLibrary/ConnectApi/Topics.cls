/**
 * Access information about topics, such as their descriptions, the number of people talking about them, related topics, and information about groups contributing to the topic. Update a topic’s name or description, merge topics, and add and remove topics from records and feed items.
 */
global class Topics {

  public static ConnectApi.Topic assignTopic(String communityId, String recordId, String topicId) {}

  public static ConnectApi.Topic assignTopicByName(String communityId, String recordId, String topicName) {}

  public static ConnectApi.Topic createTopic(String communityId, String name, String description) {}

  public static ConnectApi.TopicPage createTopicDataCategoryRules(String communityId, String dataCategoryGroup, String dataCategory, ConnectApi.TopicNamesInput topicNames) {}

  public static void deleteTopic(String communityId, String topicId) {}

  public static ConnectApi.ChatterGroupSummaryPage getGroupsRecentlyTalkingAboutTopic(String communityId, String topicId) {}

  public static ConnectApi.TopicPage getRecentlyTalkingAboutTopicsForGroup(String communityId, String groupId) {}

  public static ConnectApi.TopicPage getRecentlyTalkingAboutTopicsForUser(String communityId, String userId) {}

  public static ConnectApi.TopicPage getRelatedTopics(String communityId, String topicId) {}

  public static ConnectApi.Topic getTopic(String communityId, String topicId) {}

  public static ConnectApi.TopicPage getTopicDataCategoryRules(String communityId, String dataCategoryGroup, String dataCategory) {}

  public static ConnectApi.TopicPage getTopics(String communityId, String recordId) {}

  public static ConnectApi.TopicPage getTopics(String communityId) {}

  public static ConnectApi.TopicPage getTopics(String communityId, ConnectApi.TopicSort sortParam) {}

  public static ConnectApi.TopicPage getTopics(String communityId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.TopicPage getTopics(String communityId, Integer pageParam, Integer pageSize, ConnectApi.TopicSort sortParam) {}

  public static ConnectApi.TopicPage getTopics(String communityId, String q, ConnectApi.TopicSort sortParam) {}

  public static ConnectApi.TopicPage getTopics(String communityId, String q, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.TopicPage getTopics(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.TopicSort sortParam) {}

  public static ConnectApi.TopicPage getTopics(String communityId, String q, Boolean exactMatch) {}

  public static ConnectApi.TopicPage getTopicsOrFallBackToRenamedTopics(String communityId, String q, Boolean exactMatch, Boolean fallBackToRenamedTopics) {}

  public static ConnectApi.TopicSuggestionPage getTopicSuggestions(String communityId, String recordId, Integer maxResults) {}

  public static ConnectApi.TopicSuggestionPage getTopicSuggestions(String communityId, String recordId) {}

  public static ConnectApi.TopicSuggestionPage getTopicSuggestionsForText(String communityId, String text, Integer maxResults) {}

  public static ConnectApi.TopicSuggestionPage getTopicSuggestionsForText(String communityId, String text) {}

  public static ConnectApi.TopicPage getTrendingTopics(String communityId) {}

  public static ConnectApi.TopicPage getTrendingTopics(String communityId, Integer maxResults) {}

  public static ConnectApi.Topic mergeTopics(String communityId, String topicId, List<String> idsToMerge) {}

  public static ConnectApi.TopicPage reassignTopicDataCategoryRules(String communityId, String dataCategoryGroup, String dataCategory, ConnectApi.TopicNamesInput topicNames) {}

  public static ConnectApi.TopicPage reassignTopicsByName(String communityId, String recordId, ConnectApi.TopicNamesInput topicNames) {}

  public static void unassignTopic(String communityId, String recordId, String topicId) {}

  public static ConnectApi.Topic updateTopic(String communityId, String topicId, ConnectApi.TopicInput topic) {}

  public static ConnectApi.TopicPage updateTopicsForArticlesInDataCategory(String communityId, String dataCategoryGroup, String dataCategory, ConnectApi.ArticleTopicAssignmentJobInput articleTopicAssignmentJob) {}

  public static void setTestGetGroupsRecentlyTalkingAboutTopic(String communityId, String topicId, ConnectApi.ChatterGroupSummaryPage result) {}

  public static void setTestGetRecentlyTalkingAboutTopicsForGroup(String communityId, String groupId) {}

  public static void setTestGetRecentlyTalkingAboutTopicsForUser(String communityId, String userId, ConnectApi.TopicPage result) {}

  public static void setTestGetRelatedTopics(String communityId, String topicId, ConnectApi.TopicPage result) {}

  public static void setTestGetTopicSuggestions(String communityId, String recordId, Integer maxResults, ConnectApi.TopicSuggestionPage result) {}

  public static void setTestGetTopicSuggestions(String communityId, String recordId) {}

  public static void setTestGetTopicSuggestionsForText(String communityId, String text, Integer maxResults, ConnectApi.TopicSuggestionPage result) {}

  public static void setTestGetTopicSuggestionsForText(String communityId, String text, ConnectApi.TopicSuggestionPage result) {}

  public static void setTestGetTrendingTopics(String communityId, ConnectApi.TopicPage result) {}

  public static void setTestGetTrendingTopics(String communityId, Integer maxResults, ConnectApi.TopicPage result) {}

}