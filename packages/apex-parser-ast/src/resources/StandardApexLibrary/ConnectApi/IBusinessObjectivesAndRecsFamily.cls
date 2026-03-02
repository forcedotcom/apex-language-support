/**
 * Get and patch business objectives, or goals. Get, create, patch, and update recommended actions for business objectives.
 */
public class IBusinessObjectivesAndRecsFamily {

  public static ConnectApi.RecRepresentation createRecommendations(ConnectApi.BusObjRecommendationInputRepresentation busObjRecommendationInput) {}

  public static ConnectApi.BusinessObjectivesSummaryOutputRepresentation getBusinessObjectives(String webstoreId, String channelId, String kpiName, Boolean includeRecSummary, Boolean includeInsightSummary) {}

  public static ConnectApi.RecommendationsOutputRepresentation getRecommendations(String businessObjectiveId, String domain, String channelId, String externalName, String state, String secondaryState, String tertiaryState, String grouping) {}

  public static ConnectApi.BusObjSummaryOutputRepresentation patchBusinessObjective(ConnectApi.BusinessObjectivesInputRepresentation busObjRecommendationInput) {}

  public static ConnectApi.RecRepresentation patchRecommendations(ConnectApi.BusObjRecommendationInputRepresentation busObjRecommendationInput) {}

  public static ConnectApi.RecRepresentation updateRecommendations(ConnectApi.BusObjRecommendationInputRepresentation busObjRecommendationInput) {}

}