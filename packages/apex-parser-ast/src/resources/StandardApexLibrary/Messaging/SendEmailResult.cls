/**
 * Contains the result of sending an email message.
 */
global class SendEmailResult {

  /**
   * If an error occurred during the sendEmail method, a SendEmailError object is returned.
   * @return SendEmailError[]
   */
  public SendEmailError[] getErrors() {}

  /**
   * Indicates whether the email was successfully submitted for delivery ( true ) or not ( false ). Even if isSuccess is true, it does not mean the intended recipients received the email, as there could have been a problem with the email address or it could have bounced or been blocked by a spam blocker.
   * @return Boolean
   */
  public Boolean isSuccess() {}

}