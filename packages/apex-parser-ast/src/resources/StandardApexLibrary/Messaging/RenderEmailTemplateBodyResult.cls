/**
 * Contains the results for rendering email templates.
 */
public class RenderEmailTemplateBodyResult {

  /**
   * If an error occurred during the renderEmailTemplate method, a RenderEmailTemplateError object is returned.
   * @return List<Messaging.RenderEmailTemplateError>
   */
  public List<Messaging.RenderEmailTemplateError> getErrors() {}

  /**
   * Returns the rendered body text with merge field references replaced with the corresponding record data.
   * @return String
   */
  public String getMergedBody() {}

  /**
   * Indicates whether the operation was successful.
   * @return Boolean
   */
  public Boolean getSuccess() {}

}