/**
 * Information about failed cloned managed content variants if cloning was partially successful.
 */
global class ManagedContentFailedVariants {

  /**
   * Error message for the failure.
   */
  global String errorMessage;

  /**
   * Language of the failed translated variant.
   */
  global String language;

  /**
   * ID of the managed content variant that failed to clone.
   */
  global String sourceManagedContentVariantId;

}