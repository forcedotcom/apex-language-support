/**
 * A list of follow intents for a social persona.
 */
global class FollowIntents {

  global FollowIntents() {}

  /**
   * List of follow intents for the social persona.
   */
  global List < ConnectApi.FollowSocialPersonaIntent > follows;

  global Object clone() {}

}