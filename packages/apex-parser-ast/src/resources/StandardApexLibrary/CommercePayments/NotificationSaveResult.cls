/**
 * Contains the result of the payment platform’s attempt to record data from the gateway’s notification.
 */
public class NotificationSaveResult {

  /**
   * Gets the error message, if any, from the payment platform regarding its attempt to save the notification sent from the payment gateway.
   * @return String
   */
  public String getErrorMessage() {}

  /**
   * Gets the status code from the payment platform’s attempt to save the notification sent from the payment gateway.
   * @return Integer
   */
  public Integer getStatusCode() {}

  /**
   * Gets the status of whether the payment platform successfully saved the notification sent from the payment gateway.
   * @return Boolean
   */
  public Boolean isSuccess() {}

}