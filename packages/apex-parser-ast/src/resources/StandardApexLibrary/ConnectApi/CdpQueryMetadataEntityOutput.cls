/**
 * Represents a metadata entity.
 */
global class CdpQueryMetadataEntityOutput {

  global CdpQueryMetadataEntityOutput() {}

  /**
   * Category of the metadata entity. Supported values are: Activation_Audience CG_Audience Content Directory_Table Engagement Profile Related Segment_Membership Vector_Embedding
   */
  global String category;

  /**
   * Display name of the entity.
   */
  global String displayName;

  /**
   * Name of the entity.
   */
  global String name;

  /**
   * Type of metadata entity. Supported values are: Calculated_Insight DataLakeObject DataModelObject
   */
  global String type;

  global Object clone() {}

}