/**
 * Represents an activation output.
 */
global class Activation {

  /**
   * ID of the activation definition.
   */
  global String activationDefinitionId;

  /**
   * Customer file source of the activation platform. First_And_Third_Party First_Party Third_Party
   */
  global ConnectApi.ActivationPlatformCustomerFileSourceEnum activationPlatformCustomerFileSourceEnum;

  /**
   * JSON schema representing the activation JSON payload in the activationRecord field of the AudienceDMO.
   */
  global String activationRecordSchema;

  /**
   * Activation target details.
   */
  global ConnectApi.ActivationTargetRepresentation activationTarget;

  /**
   * Activation target ID for the activation.
   */
  global String activationTargetId;

  /**
   * Activation target name for the activation.
   */
  global String activationTargetName;

  /**
   * Object path for the activation target.
   */
  global List < ConnectApi.QueryPathConfigList > activationTargetObjectPath;

  /**
   * Activation target subject for the activation.
   */
  global ConnectApi.ActivationTargetSubject activationTargetSubject;

  /**
   * Attributes for the activation.
   */
  global ConnectApi.ActivationAttributeConfig attributesConfig;

  /**
   * Contact points for the activation.
   */
  global ConnectApi.ContactPointsConfig contactPointsConfig;

  /**
   * API name of the entity curated by the activation.
   */
  global String curatedEntityApiName;

  /**
   * ID of the entity curated by the activation.
   */
  global String curatedEntityId;

  /**
   * Name of the entity curated by the activation.
   */
  global String curatedEntityName;

  /**
   * Data sources for the activation.
   */
  global ConnectApi.ActivationDataSources dataSourcesConfig;

  /**
   * Data space name for the activation.
   */
  global String dataSpaceName;

  /**
   * Data space ID for the activation.
   */
  global String dataspaceId;

  /**
   * Description of the activation.
   */
  global String description;

  /**
   * Developer name for the activation.
   */
  global String developerName;

  /**
   * Direct DMO filters for the activation.
   */
  global ConnectApi.DmoFilterConfig directDmoFiltersConfig;

  /**
   * Indicates if the activation is enabled ( true ) or not ( false ) .
   */
  global Boolean enabled;

  /**
   * API name for the history audience DMO.
   */
  global String historyAudienceDmoApiName;

  /**
   * Name of the history audience DMO.
   */
  global String historyAudienceDmoLabel;

  /**
   * Last publish timestamp of the activation. Use the format yyyy-mm-dd .
   */
  global Datetime lastPublishDate;

  /**
   * Last publish status of the activation. Error Partner_Error Partner_Processing Publishing Queued Segment_Error Skipped Success
   */
  global ConnectApi.DataExportRunStatusEnum lastPublishStatus;

  /**
   * Error message encountered during last publish.
   */
  global String lastPublishStatusErrorMsg;

  /**
   * API name for the latest audience DMO.
   */
  global String latestAudienceDmoApiName;

  /**
   * Name for the latest audience DMO.
   */
  global String latestAudienceDmoLabel;

  /**
   * Timestamp of the last run for the latest audience DMO. Use the format yyyy-mm-dd .
   */
  global Datetime latestAudienceDmoLastRunTimestamp;

  /**
   * Membership name of the activation.
   */
  global String membershipName;

  /**
   * Refresh type of the activation. Full_Refresh Incremental
   */
  global ConnectApi.DataExportRefreshModeEnum refreshType;

  /**
   * DMO filters on related attributes for the activation.
   */
  global ConnectApi.DmoFilterConfig relatedDmoFiltersConfig;

  /**
   * API name for the activation segment.
   */
  global String segmentApiName;

  /**
   * Definition ID for the activation segment.
   */
  global String segmentDefinitionId;

  /**
   * ID for the activation segment.
   */
  global String segmentId;

  /**
   * Indicates whether to exclude records removed since the last refresh ( true ) or not ( false ) .
   */
  global Boolean shouldExcludeDeletes;

  /**
   * Indicates whether to exclude records modified since the last refresh ( true ) or not ( false ) .
   */
  global Boolean shouldExcludeUpdates;

  /**
   * Static data of the activation.
   */
  global ConnectApi.StaticDataConfig staticDataConfig;

  /**
   * Status of the activation. Active Processing Error Inactive
   */
  global ConnectApi.ActivationStatusEnum status;

}