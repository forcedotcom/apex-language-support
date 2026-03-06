/**
 * Managed content clone input.
 */
global class ManagedContentDocumentCloneInput {

  /**
   * API name of the cloned content.
   */
  global String apiName;

  /**
   * ID of the target folder for the cloned content. If unspecified, defaults to the folder of the source content.
   */
  global String contentSpaceOrFolderId;

  /**
   * Specifies whether to include variants ( true ) or not ( false ) when cloning the content. If unspecified, default is false .
   */
  global Boolean includeVariants;

  /**
   * Title of the cloned content. If unspecified, “clone of” is appended to the source content’s title.
   */
  global String title;

}