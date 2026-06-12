/**
 * Represents an attribute for an activation external platform.
 */
global class ActivationExternalPlatformAttribute {

  global ActivationExternalPlatformAttribute() {}

  /**
   * Destination name of the external platform attribute.
   */
  global String destinationName;

  /**
   * Display name of the external platform attribute. This field is applicable only for ecoSystem external platforms.
   */
  global String displayName;

  global Object clone() {}

}