/**
 * A custom recommendation audience.
 */
global class RecommendationAudienceInput {

  /**
   * The criteria for the custom recommendation audience type.
   */
  global ConnectApi.AudienceCriteriaInput criteria;

  /**
   * Important This property is available only in version 35.0. In version 36.0 and later, use ConnectApi.CustomListAudienceCriteriaInput . The operation to carry out on the audience members. Add —Adds specified members to the audience. Remove —Removes specified members from the audience.
   */
  global ConnectApi.RecommendationAudienceMemberOperationType memberOperationType;

  /**
   * Important This property is available only in version 35.0. In version 36.0 and later, use ConnectApi.CustomListAudienceCriteriaInput . A collection of user IDs. When updating an audience, you can include up to 100 members. An audience can have up to 100,000 members, and each Experience Cloud site can have up to 100 audiences.
   */
  global List < String > members;

  /**
   * The unique name of the custom recommendation audience.
   */
  global String name;

}