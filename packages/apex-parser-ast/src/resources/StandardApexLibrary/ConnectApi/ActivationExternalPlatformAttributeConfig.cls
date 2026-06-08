/**
 * Represents the attribute configuration for an activation external platform.
 */
global class ActivationExternalPlatformAttributeConfig {

  global ActivationExternalPlatformAttributeConfig() {}

  /**
   * List of attributes for the external platform.
   */
  global List < ConnectApi.ActivationExternalPlatformAttribute > attributes;

  global Object clone() {}

}