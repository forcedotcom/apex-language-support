/**
 * A custom recommendation audience.
 */
global class RecommendationAudience {

  /**
   * The criteria for the custom recommendation audience type.
   */
  global ConnectApi.AudienceCriteria criteria;

  /**
   * 18-character ID of the custom recommendation audience.
   */
  global String id;

  /**
   * Important This property is available only in version 35.0. In version 36.0 and later, this property is available in ConnectApi.CustomListAudienceCriteria . Number of members in the custom recommendation audience.
   */
  global Integer memberCount;

  /**
   * Important This property is available only in version 35.0. In version 36.0 and later, this property is available in ConnectApi.CustomListAudienceCriteria . Members of the custom recommendation audience.
   */
  global ConnectApi.UserReferencePage members;

  /**
   * User who last modified the custom recommendation audience.
   */
  global ConnectApi.User modifiedBy;

  /**
   * ISO 8601 format date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime modifiedDate;

  /**
   * Name of the custom recommendation audience.
   */
  global String name;

  /**
   * URL to the custom recommendation audience.
   */
  global String url;

}