/**
 * Get assigned personalization audiences that match the user context. Create, get, update, and delete an audience. Get personalization targets that match the user context, based on the assigned audiences that include the user. Create and update targets. Get and delete a target.
 */
global class Personalization {

  global Personalization() {}

  global static ConnectApi.Audience createAudience(String communityId, ConnectApi.AudienceInput audience) {}

  global static ConnectApi.TargetCollection createTargets(String communityId, ConnectApi.TargetCollectionInput target) {}

  global static void deleteAudience(String communityId, String audienceId) {}

  global static void deleteTarget(String communityId, String targetId) {}

  global static ConnectApi.Audience getAudience(String communityId, String audienceId, Boolean includeAudienceCriteria) {}

  global static ConnectApi.BatchResult[] getAudienceBatch(String communityId, List<String> audienceIds) {}

  global static ConnectApi.AudienceCollection getAudiences(String communityId, String ipAddress, String domain, String userId, ConnectApi.PublishStatus publishStatus, Boolean includeAudienceCriteria, List<String> targetTypes, String recordId) {}

  global static ConnectApi.AudienceCollection getAudiences(String communityId, String ipAddress, String domain, String userId, ConnectApi.PublishStatus publishStatus, Boolean includeAudienceCriteria, List<String> targetTypes) {}

  global static ConnectApi.Target getTarget(String communityId, String targetId) {}

  global static ConnectApi.BatchResult[] getTargetBatch(String communityId, List<String> targetIds) {}

  global static ConnectApi.TargetCollection getTargets(String communityId, String ipAddress, String domain, String userId, ConnectApi.PublishStatus publishStatus, String recordId, List<String> targetTypes, Boolean includeAudience, Boolean includeAllMatchingTargetsWithinGroup, List<String> groupNames) {}

  global static ConnectApi.Audience updateAudience(String communityId, String audienceId, ConnectApi.AudienceInput audience) {}

  global static ConnectApi.TargetCollection updateTargets(String communityId, ConnectApi.TargetCollectionUpdateInput target) {}

  global Object clone() {}

}