/**
 * The Support.EmailTemplateSelector interface enables providing default email templates in Case Feed. With default email templates, specified email templates are preloaded for cases based on criteria such as case origin or subject.
 */
global interface EmailTemplateSelector {

  /**
   * Returns the ID of the email template to preload for the case currently being viewed in the case feed using the specified case ID.
   * @param caseId 
   * @return ID
   */
  ID getDefaultTemplateId(ID caseId);

}