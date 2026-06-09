/**
 * Get and patch business objectives, or goals. Get, create, patch, and update recommended actions for business objectives.
 */
global class IBusinessObjectivesAndRecsFamily {

  global IBusinessObjectivesAndRecsFamily() {}

  global static ConnectApi.RecRepresentation createRecommendations(ConnectApi.BusObjRecommendationInputRepresentation busObjRecommendationInput) {}

  global static ConnectApi.BusinessObjectivesSummaryOutputRepresentation getBusinessObjectives(String webstoreId, String channelId, String kpiName, Boolean includeRecSummary, Boolean includeInsightSummary) {}

  global static ConnectApi.RecommendationsOutputRepresentation getRecommendations(String businessObjectiveId, String domain, String channelId, String externalName, String state, String secondaryState, String tertiaryState, String grouping) {}

  global static ConnectApi.BusObjSummaryOutputRepresentation patchBusinessObjective(ConnectApi.BusinessObjectivesInputRepresentation busObjRecommendationInput) {}

  global static ConnectApi.RecRepresentation patchRecommendations(ConnectApi.BusObjRecommendationInputRepresentation busObjRecommendationInput) {}

  global static ConnectApi.RecRepresentation updateRecommendations(ConnectApi.BusObjRecommendationInputRepresentation busObjRecommendationInput) {}

  global Object clone() {}

}