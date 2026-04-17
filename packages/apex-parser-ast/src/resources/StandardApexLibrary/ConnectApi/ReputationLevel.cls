/**
 * Reputation level for a user.
 */
global class ReputationLevel {

  /**
   * URL to the reputation level image.
   */
  global String levelImageUrl;

  /**
   * Name of the reputation level.
   */
  global String levelName;

  /**
   * Reputation level number, which is the numerical rank of the level, with the lowest level at 1. Administrators define the reputation level point ranges.
   */
  global Integer levelNumber;

}