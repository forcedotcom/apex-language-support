/**
 * Information about masked data for a prompt template.
 */
global class EinsteinPromptTemplateMaskDataRepresentation {

  /**
   * Original value of the masked data.
   */
  global String originalValue;

  /**
   * Placeholder value of the masked data.
   */
  global String placeHolder;

  /**
   * Reserved for internal use.
   */
  global List < String > recognizers;

}