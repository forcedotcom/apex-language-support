/**
 * Represents the activation definition input.
 */
global class ActivationDefinitionInput {

  /**
   * Name of the activation target. Either activationTargetName or dataExportDefinitionId must be present.
   */
  global String activationTargetName;

  /**
   * Subject configuration for the activation target.
   */
  global ActivationTargetSubjectConfigInputRepresentation activationTargetSubjectConfig;

  /**
   * Limiting expression configuration for the activation.
   */
  global List < ConnectApi.AttributeLimitingExpressionInput > attributeLimitingExpressionConfig;

  /**
   * Additional attributes for the activation.
   */
  global List < ConnectApi.ActivationAdditionalAttributesConfigInput > attributesConfig;

  /**
   * Contact points configuration for the activation target.
   */
  global List < ConnectApi.ActivationContactPointInput > contactPointsConfig;

  /**
   * Curated entity details for the activation.
   */
  global CuratedEntityInputRepresentation curatedEntity;

  /**
   * Customer file source of the activation platform. First_And_Third_Party First_Party Third_Party
   */
  global ActivationPlatformCustomerFileSourceEnum customerFileSource;

  /**
   * Activation target ID for the activation. Either activationTargetName or dataExportDefinitionId must be present.
   */
  global String dataExportDefinitionId;

  /**
   * Data source configuration for the activation.
   */
  global List < ConnectApi.DataSourceNameConfigInput > dataSourcesConfig;

  /**
   * Data space name for the activation.
   */
  global String dataSpaceName;

  /**
   * Description of the activation.
   */
  global String description;

  /**
   * Direct DMO filters for the activation.
   */
  global List < ConnectApi.DMOFilterInput > directDmoFiltersConfig;

  /**
   * Audience limit value for the activation.
   */
  global Integer limitValue;

  /**
   * Segment ID of the segment the activation needs to be created against. Either marketSegmentID or segmentApiName must be present.
   */
  global String marketSegmentId;

  /**
   * Name of the activation.
   */
  global String name;

  /**
   * Indicates the refresh type for the activation, either Full or Incremental .
   */
  global String refreshType;

  /**
   * DMO filters on related attributes for the activation.
   */
  global List < ConnectApi.DMOFilterInput > relatedDmoFiltersConfig;

  /**
   * Developer name of the segment the activation needs to be created against. Either marketSegmentID or segmentApiName must be present.
   */
  global String segmentApiName;

  /**
   * Indicates whether to exclude records removed since the last refresh ( true ) or not ( false ) .
   */
  global Boolean shouldExcludeDeletes;

  /**
   * Indicates whether to exclude records modified since the last refresh ( true ) or not ( false ) .
   */
  global Boolean shouldExcludeUpdates;

  /**
   * Configuration of static data, which adds metadata or campaign details in the ouput. For example, campaignId or campaignName .
   */
  global List < ConnectApi.StaticDataInput > staticDataConfig;

}