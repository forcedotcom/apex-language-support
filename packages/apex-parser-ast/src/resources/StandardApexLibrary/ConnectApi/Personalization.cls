/**
 * Get assigned personalization audiences that match the user context. Create, get, update, and delete an audience. Get personalization targets that match the user context, based on the assigned audiences that include the user. Create and update targets. Get and delete a target.
 */
global class Personalization {

  public static ConnectApi.Audience createAudience(String communityId, ConnectApi.AudienceInput audience) {}

  public static ConnectApi.TargetCollection createTargets(String communityId, ConnectApi.TargetCollectionInput target) {}

  public static void deleteAudience(String communityId, String audienceId) {}

  public static void deleteTarget(String communityId, String targetId) {}

  public static ConnectApi.Audience getAudience(String communityId, String audienceId, Boolean includeAudienceCriteria) {}

  public static ConnectApi.BatchResult[] getAudienceBatch(String communityId, List< String > audienceIds) {}

  public static ConnectApi.AudienceCollection getAudiences(String communityId, String ipAddress, String domain, String userId, ConnectApi.PublishStatus publishStatus, Boolean includeAudienceCriteria, List< String > targetTypes, String recordId) {}

  public static ConnectApi.AudienceCollection getAudiences(String communityId, String ipAddress, String domain, String userId, ConnectApi.PublishStatus publishStatus, Boolean includeAudienceCriteria, List< String > targetTypes) {}

  public static ConnectApi.Target getTarget(String communityId, String targetId) {}

  public static ConnectApi.BatchResult[] getTargetBatch(String communityId, List< String > targetIds) {}

  public static ConnectApi.TargetCollection getTargets(String communityId, String ipAddress, String domain, String userId, ConnectApi.PublishStatus publishStatus, String recordId, List< String > targetTypes, Boolean includeAudience, Boolean includeAllMatchingTargetsWithinGroup, List< String > groupNames) {}

  public static ConnectApi.Audience updateAudience(String communityId, String audienceId, ConnectApi.AudienceInput audience) {}

  public static ConnectApi.TargetCollection updateTargets(String communityId, ConnectApi.TargetCollectionUpdateInput target) {}

}