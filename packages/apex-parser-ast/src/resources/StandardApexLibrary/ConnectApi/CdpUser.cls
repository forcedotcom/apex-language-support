/**
 * Represents information about a user.
 */
global class CdpUser {

  global CdpUser() {}

  /**
   * The 18-character ID of the user.
   */
  global String id;

  /**
   * Name of the user.
   */
  global String name;

  /**
   * Profile photo of the user,
   */
  global String profilePhotoUrl;

  global Object clone() {}

}