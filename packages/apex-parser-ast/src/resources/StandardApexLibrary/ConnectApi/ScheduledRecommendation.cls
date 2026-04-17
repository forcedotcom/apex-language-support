/**
 * Represents a scheduled custom recommendation.
 */
global class ScheduledRecommendation {

  /**
   * A way to tie custom recommendations together. For example, display recommendations in specific places in the UI or show recommendations based on time of day or geographic locations. Values are: CustomChannel1 — Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. For example, community managers can use Experience Builder to determine where recommendations appear. CustomChannel2 —Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. CustomChannel3 —Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. CustomChannel4 —Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. CustomChannel5 —Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. DefaultChannel —Default recommendation channel. Recommendations appear by default on the Home and Question Detail pages of Customer Service and Partner Central Experience Builder templates. They also appear in the feed in the Salesforce mobile web and anywhere community managers add recommendations using Experience Builder.
   */
  global ConnectApi.RecommendationChannel channel;

  /**
   * Indicates whether scheduling is enabled. If true , the custom recommendation is enabled and appears in Experience Cloud sites. If false , custom recommendations in feeds in Salesforce mobile web aren’t removed, but no new custom recommendations appear. In Customer Service and Partner Central sites, disabled custom recommendations no longer appear.
   */
  global Boolean enabled;

  /**
   * 18-character ID of the scheduled custom recommendation.
   */
  global String id;

  /**
   * The rank determining the order of this scheduled custom recommendation.
   */
  global Integer rank;

  /**
   * ID of the audience for the scheduled custom recommendation.
   */
  global String recommendationAudienceId;

  /**
   * Custom recommendation definition that this scheduled recommendation schedules.
   */
  global ConnectApi.RecommendationDefinition recommendationDefinitionRepresentation;

  /**
   * URL to the Connect REST API resource for the scheduled custom recommendation.
   */
  global String url;

}