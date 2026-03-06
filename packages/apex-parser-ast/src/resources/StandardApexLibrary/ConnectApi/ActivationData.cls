/**
 * Represents the activation data for an Audience Data Model Object (DMO).
 */
global class ActivationData {

  /**
   * Fully Qualified Key (FQK) of the activated entity.
   */
  global String activatedEntityFqk;

  /**
   * ActivateOn entity ID, such as the Individual.Id or the Unified Individual.Id.
   */
  global String activatedOnId;

  /**
   * Activated attributes payload as JSON BLOB.
   */
  global String activationRecord;

  /**
   * Delta type of the activation. A —ADDED D —DELETED E —EXISTING U —UPDATED
   */
  global AudienceDMODeltaTypeEnum deltaType;

  /**
   * Date that the activation was published.
   */
  global String publishDate;

  /**
   * Unique ID for each segment.
   */
  global String segmentId;

  /**
   * Key identifier based on the SegmentOn enity. Same as Activated-entity-id when ActivateOn = SegmentOn.
   */
  global String segmentOnId;

  /**
   * Fully Qualified Key (FQK) of the segmented entity.
   */
  global String segmentedEntityFqk;

}