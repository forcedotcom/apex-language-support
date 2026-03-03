/**
 * Get and reject Chatter, custom, and static recommendations. Create, get, update, and delete custom recommendation audiences, custom recommendation definitions, and scheduled custom recommendations.
 */
global class Recommendations {

  public static ConnectApi.RecommendationAudience createRecommendationAudience(String communityId, ConnectApi.RecommendationAudienceInput recommendationAudience) {}

  public static ConnectApi.RecommendationAudience createRecommendationAudience(String communityId, String name) {}

  public static ConnectApi.RecommendationDefinition createRecommendationDefinition(String communityId, ConnectApi.RecommendationDefinitionInput recommendationDefinition) {}

  public static ConnectApi.RecommendationDefinition createRecommendationDefinition(String communityId, String name, String title, String actionUrl, String actionUrlName, String explanation) {}

  public static ConnectApi.ScheduledRecommendation createScheduledRecommendation(String communityId, ConnectApi.ScheduledRecommendationInput scheduledRecommendation) {}

  public static ConnectApi.ScheduledRecommendation createScheduledRecommendation(String communityId, String recommendationDefinitionId, Integer rank, Boolean enabled, String recommendationAudienceId, ConnectApi.RecommendationChannel channel) {}

  public static void deleteRecommendationAudience(String communityId, String recommendationAudienceId) {}

  public static void deleteRecommendationDefinition(String communityId, String recommendationDefinitionId) {}

  public static void deleteRecommendationDefinitionPhoto(String communityId, String recommendationDefinitionId) {}

  public static void deleteScheduledRecommendation(String communityId, String scheduledRecommendationId, Boolean deleteDefinitionIfLast) {}

  public static ConnectApi.RecommendationAudience getRecommendationAudience(String communityId, String recommendationAudienceId) {}

  public static ConnectApi.UserReferencePage getRecommendationAudienceMembership(String communityId, String recommendationAudienceId) {}

  public static ConnectApi.UserReferencePage getRecommendationAudienceMembership(String communityId, String recommendationAudienceId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.RecommendationAudiencePage getRecommendationAudiences(String communityId) {}

  public static ConnectApi.RecommendationAudiencePage getRecommendationAudiences(String communityId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.RecommendationDefinition getRecommendationDefinition(String communityId, String recommendationDefinitionId) {}

  public static ConnectApi.Photo getRecommendationDefinitionPhoto(String communityId, String recommendationDefinitionId) {}

  public static ConnectApi.RecommendationDefinitionPage getRecommendationDefinitions(String communityId) {}

  public static ConnectApi.RecommendationCollection getRecommendationForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, String objectId) {}

  public static ConnectApi.RecommendationCollection getRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType contextAction, String contextObjectId, ConnectApi.RecommendationChannel channel, Integer maxResults) {}

  public static ConnectApi.RecommendationCollection getRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, ConnectApi.RecommendationActionType contextAction, String contextObjectId, ConnectApi.RecommendationChannel channel, Integer maxResults) {}

  public static ConnectApi.RecommendationCollection getRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, String objectCategory, ConnectApi.RecommendationActionType contextAction, String contextObjectId, ConnectApi.RecommendationChannel channel, Integer maxResults) {}

  public static ConnectApi.ScheduledRecommendation getScheduledRecommendation(String communityId, String scheduledRecommendationId) {}

  public static ConnectApi.ScheduledRecommendationPage getScheduledRecommendations(String communityId, ConnectApi.RecommendationChannel channel) {}

  public static rejectRecommendationForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, String objectId) {}

  public static rejectRecommendationForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, ConnectApi.RecommendedObjectType objectEnum) {}

  public static ConnectApi.RecommendationAudience updateRecommendationAudience(String communityId, String recommendationAudienceId, ConnectApi.RecommendationAudienceInput recommendationAudience) {}

  public static ConnectApi.RecommendationDefinition updateRecommendationDefinition(String communityId, String recommendationDefinitionId, String name, String title, String actionUrl, String actionUrlName, String explanation recommendationDefinition) {}

  public static ConnectApi.RecommendationDefinition updateRecommendationDefinition(String communityId, String recommendationDefinitionId, ConnectApi.RecommendationDefinitionInput recommendationDefinition) {}

  public static ConnectApi.Photo updateRecommendationDefinitionPhoto(String communityId, String recommendationDefinitionId, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.Photo updateRecommendationDefinitionPhoto(String communityId, String recommendationDefinitionId, String fileId, Integer versionNumber) {}

  public static ConnectApi.Photo updateRecommendationDefinitionPhotoWithAttributes(String communityId, String recommendationDefinitionId, ConnectApi.PhotoInput photo) {}

  public static ConnectApi.Photo updateRecommendationDefinitionPhotoWithAttributes(String communityId, String recommendationDefinitionId, ConnectApi.PhotoInput photo, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.ScheduledRecommendation updateScheduledRecommendation(String communityId, String scheduledRecommendationId, ConnectApi.ScheduledRecommendationInput scheduledRecommendation) {}

  public static ConnectApi.ScheduledRecommendation updateScheduledRecommendation(String communityId, String scheduledRecommendationId, Integer rank, Boolean enabled, String recommendationAudienceId) {}

  public static void setTestGetRecommendationForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, String objectId, ConnectApi.RecommendationCollection result) {}

  public static void setTestGetRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType contextAction, String contextObjectId, ConnectApi.RecommendationChannel channel, Integer maxResults, ConnectApi.RecommendationCollection result) {}

  public static void setTestGetRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, ConnectApi.RecommendationActionType contextAction, String contextObjectId, ConnectApi.RecommendationChannel channel, Integer maxResults, ConnectApi.RecommendationCollection result) {}

  public static void setTestGetRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, String objectCategory, ConnectApi.RecommendationActionType contextAction, String contextObjectId, ConnectApi.RecommendationChannel channel, Integer maxResults, ConnectApi.RecommendationCollection result) {}

  public static ConnectApi.ScheduledRecommendation createScheduledRecommendation(String communityId, String recommendationDefinitionId, Integer rank, Boolean enabled, String recommendationAudienceId) {}

  public static ConnectApi.RecommendationCollection getRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType contextAction, String contextObjectId, Integer maxResults) {}

  public static ConnectApi.RecommendationCollection getRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, ConnectApi.RecommendationActionType contextAction, String contextObjectId, Integer maxResults) {}

  public static ConnectApi.RecommendationCollection getRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, String objectCategory, ConnectApi.RecommendationActionType contextAction, String contextObjectId, Integer maxResults) {}

  public static ConnectApi.ScheduledRecommendationPage getScheduledRecommendations(String communityId) {}

  public static void setTestGetRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType contextAction, String contextObjectId, Integer maxResults, ConnectApi.RecommendationCollection result) {}

  public static void setTestGetRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, ConnectApi.RecommendationActionType contextAction, String contextObjectId, Integer maxResults, ConnectApi.RecommendationCollection result) {}

  public static void setTestGetRecommendationsForUser(String communityId, String userId, ConnectApi.RecommendationActionType action, String objectCategory, ConnectApi.RecommendationActionType contextAction, String contextObjectId, Integer maxResults, ConnectApi.RecommendationCollection result) {}

}