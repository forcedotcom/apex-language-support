/**
 * Contains validation errors that occur when the user saves the page that uses a standard controller.
 */
global class Message {

  public Message(ApexPages.Severity severity, String summary) {}

  public Message(ApexPages.Severity severity, String summary, String detail) {}

  public Message(ApexPages.Severity severity, String summary, String detail, String id) {}

  /**
   * Returns the label of the associated inputField component. If no label is defined, this method returns null .
   * @return String
   */
  public String getComponentLabel() {}

  /**
   * Returns the value of the detail parameter used to create the message. If no detail String was specified, this method returns null .
   * @return String
   */
  public String getDetail() {}

  /**
   * Returns the severity enum used to create the message.
   * @return ApexPages.Severity
   */
  public ApexPages.Severity getSeverity() {}

  /**
   * Returns the summary String used to create the message.
   * @return String
   */
  public String getSummary() {}

}