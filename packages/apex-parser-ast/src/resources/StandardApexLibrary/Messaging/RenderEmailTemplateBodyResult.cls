/**
 * Contains the results for rendering email templates.
 */
global class RenderEmailTemplateBodyResult {

  global RenderEmailTemplateBodyResult() {}

  /**
   * If an error occurred during the renderEmailTemplate method, a RenderEmailTemplateError object is returned.
   * @return List<Messaging.RenderEmailTemplateError>
   */
  global List<Messaging.RenderEmailTemplateError> getErrors() {}

  /**
   * Returns the rendered body text with merge field references replaced with the corresponding record data.
   * @return String
   */
  global String getMergedBody() {}

  /**
   * Indicates whether the operation was successful.
   * @return Boolean
   */
  global Boolean getSuccess() {}

  global Object clone() {}

}