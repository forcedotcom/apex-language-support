/**
 * Input representation for a piece of managed content.
 */
global class ManagedContentDocumentInput {

  /**
   * API name of the managed content.
   */
  global String apiName;

  /**
   * Body of the managed content.
   */
  global ConnectApi.ManagedContentBodyInput contentBody;

  /**
   * Content key to assign to the managed content. A content key is a universally unique identifier (UUID) such as MCA4CCV5QS2BAB5H7YRCRPTCWGZQ.
   */
  global String contentKey;

  /**
   * Content space or folder ID where the content is created.
   */
  global String contentSpaceOrFolderId;

  /**
   * Fully qualified name of the content type to create. If you’re uploading a binary file using a multipart/form-data message, contentType must be sfdc_cms__image or sfdc_cms__doc . You can't create a Form using sfdc_cms__form . The sfdc_cms__form content type isn't supported.
   */
  global String contentType;

  /**
   * External ID of the managed content.
   */
  global String externalId;

  /**
   * Title of the managed content.
   */
  global String title;

  /**
   * URL name of the managed content within the org.
   */
  global String urlName;

}