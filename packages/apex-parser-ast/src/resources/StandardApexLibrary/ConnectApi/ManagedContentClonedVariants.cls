/**
 * Information about clone variants.
 */
global class ManagedContentClonedVariants {

  global ManagedContentClonedVariants() {}

  /**
   * Language of the translated clone variant.
   */
  global String language;

  /**
   * ID of the clone variant.
   */
  global String managedContentVariantId;

  /**
   * Resource URL of the clone variant.
   */
  global String resourceURL;

  global Object clone() {}

}