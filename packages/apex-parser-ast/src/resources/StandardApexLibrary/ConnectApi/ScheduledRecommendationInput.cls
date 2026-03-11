/**
 * A scheduled custom recommendation.
 */
global class ScheduledRecommendationInput {

  /**
   * A way to tie custom recommendations together. For example, display recommendations in specific places in the UI or show recommendations based on time of day or geographic locations. Values are: CustomChannel1 — Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. For example, community managers can use Experience Builder to determine where recommendations appear. CustomChannel2 —Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. CustomChannel3 —Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. CustomChannel4 —Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. CustomChannel5 —Custom recommendation channel. Not used by default. Work with your community manager to define custom channels. DefaultChannel —Default recommendation channel. Recommendations appear by default on the Home and Question Detail pages of Customer Service and Partner Central Experience Builder templates. They also appear in the feed in the Salesforce mobile web and anywhere community managers add recommendations using Experience Builder. Use these channel values; you can’t rename or create other channels.
   */
  global ConnectApi.RecommendationChannel channel;

  /**
   * Indicates whether scheduling is enabled. If true , the custom recommendation is enabled and appears in Experience Cloud sites. If false , custom recommendations in feeds in Salesforce mobile web aren’t removed, but no new custom recommendations appear. In Customer Service and Partner Central sites, disabled custom recommendations no longer appear.
   */
  global Boolean enabled;

  /**
   * Relative rank of the scheduled custom recommendation indicated by ascending whole numbers starting with 1. Setting the rank is comparable to an insertion into an ordered list. The scheduled custom recommendation is inserted into the position specified by the rank . The rank of all the scheduled custom recommendations after it is pushed down. See Ranking scheduled custom recommendations example . If the specified rank is larger than the size of the list, the scheduled custom recommendation is put at the end of the list. The rank of the scheduled custom recommendation is the size of the list, instead of the one specified. If a rank is not specified, the scheduled custom recommendation is put at the end of the list.
   */
  global Integer rank;

  /**
   * ID of the audience for this scheduled custom recommendation.When updating a scheduled custom recommendation, specify ALL to remove the association between a custom recommendation audience and a scheduled custom recommendation.
   */
  global String recommendationAudienceId;

  /**
   * ID of the custom recommendation definition that this scheduled recommendation schedules.
   */
  global String recommendationDefinitionId;

}