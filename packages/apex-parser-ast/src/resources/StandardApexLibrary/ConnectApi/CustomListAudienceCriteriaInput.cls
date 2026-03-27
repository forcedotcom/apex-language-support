/**
 * Criteria for the custom list type of custom recommendation audience.
 */
global class CustomListAudienceCriteriaInput extends ConnectApi.AudienceCriteriaInput {

  /**
   * The operation to carry out on the audience members. Values are: Add —Adds specified members to the audience. Remove —Removes specified members from the audience.
   */
  global ConnectApi.RecommendationAudienceMemberOperationType memberOperationType;

  /**
   * A collection of user IDs. When updating an audience, you can include up to 100 members. An audience can have up to 100,000 members, and each Experience Cloud site can have up to 100 audiences.
   */
  global List < String > members;

}