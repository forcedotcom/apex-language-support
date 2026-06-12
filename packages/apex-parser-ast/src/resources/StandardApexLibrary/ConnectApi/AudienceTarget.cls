/**
 * Personalization audience assigned to a target.
 */
global class AudienceTarget {

  global AudienceTarget() {}

  /**
   * Name of the audience assigned to the target.
   */
  global String audienceName;

  /**
   * ID of the audience assigned to the target.
   */
  global String id;

  /**
   * URL to the audience assigned to the target.
   */
  global String url;

  global Object clone() {}

}