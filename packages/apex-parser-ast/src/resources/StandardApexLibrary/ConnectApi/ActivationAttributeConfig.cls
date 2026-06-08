/**
 * Represents the configuration for activation attributes.
 */
global class ActivationAttributeConfig {

  global ActivationAttributeConfig() {}

  /**
   * List of activation attributes.
   */
  global List < ConnectApi.ActivationAttribute > attributes;

  global Object clone() {}

}