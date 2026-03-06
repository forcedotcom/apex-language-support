/**
 * Recommended action for a business objective, or goal.
 */
global class BusObjRecommendationInputRepresentation {

  /**
   * Text indicating user acceptance of the recommended action.
   */
  global String acceptanceLabel;

  /**
   * Name and parameters required for processing and displaying the recommended action.
   */
  global ConnectApi.ActionInfoInputRepresentation actionInfo;

  /**
   * 18-character business objective ID associated with the recommended action.
   */
  global String businessObjectiveId;

  /**
   * Associated channel ID for the recommended action.
   */
  global String channelId;

  /**
   * Detailed description of the recommended action.
   */
  global String description;

  /**
   * Domain category of the recommended action (e.g., "Product").
   */
  global String domain;

  /**
   * External identifier used for recommended action tracking.
   */
  global String externalName;

  /**
   * JSON string containing data required for executing the recommended action.
   */
  global String externalState;

  /**
   * 18-character GoalAssignment ID linked to the recommended action.
   */
  global String goalId;

  /**
   * Free-form categorization field to keep track of additional groupings of the recommended actions.
   */
  global String grouping;

  /**
   * SLDS icon name representing the recommended action domain.
   */
  global String iconName;

  /**
   * Content asset file ID for the recommended action display image.
   */
  global String imageId;

  /**
   * Display name of the recommended action.
   */
  global String name;

  /**
   * Stores the last executed snapshot of the recommended action.
   */
  global ConnectApi.ActionInfoInputRepresentation output;

  /**
   * 18-character unique identifier for the recommended action.
   */
  global String recommendationId;

  /**
   * Text indicating user rejection of the recommended action.
   */
  global String rejectionLabel;

  /**
   * Impact score of the recommended action (value between 0-100).
   */
  global String score;

  /**
   * Optional state field for additional filtering of recommended action states.
   */
  global String secondaryState;

  /**
   * Primary state of the recommended action (e.g., "ACTIVE", "INACTIVE", "ACCEPTED", "NOT_EXPIRING").
   */
  global String state;

  /**
   * Optional state field for additional filtering of recommended action states.
   */
  global String tertiaryState;

}