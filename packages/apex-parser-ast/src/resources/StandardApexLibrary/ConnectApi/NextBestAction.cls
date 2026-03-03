/**
 * Execute recommendation strategies, get recommendations, manage recommendation reactions.
 */
global class NextBestAction {

  public static void deleteRecommendationReaction(String reactionId) {}

  public static ConnectApi.NBARecommendations executeStrategy(String strategyName, Integer maxResults, String contextRecordId) {}

  public static ConnectApi.NBARecommendations executeStrategy(String strategyName, Integer maxResults, String contextRecordId, Boolean debugTrace) {}

  public static ConnectApi.NBARecommendations executeStrategy(String strategyName, ConnectApi.NBAStrategyInput strategyInput) {}

  public static ConnectApi.Recommendation getRecommendation(String recommendationId) {}

  public static ConnectApi.RecommendationReaction getRecommendationReaction(String reactionId) {}

  public static ConnectApi.RecommendationReactions getRecommendationReactions(String onBehalfOfId, String createdById, String targetId, String contextRecordId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.RecommendationReaction setRecommendationReaction(ConnectApi.RecommendationReactionInput reaction) {}

}