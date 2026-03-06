/**
 * Contains the result of the payment platform’s attempt to record data from the gateway’s notification.
 */
global class NotificationSaveResult {

  /**
   * Gets the error message, if any, from the payment platform regarding its attempt to save the notification sent from the payment gateway.
   * @return String
   */
  global String getErrorMessage() {}

  /**
   * Gets the status code from the payment platform’s attempt to save the notification sent from the payment gateway.
   * @return Integer
   */
  global Integer getStatusCode() {}

  /**
   * Gets the status of whether the payment platform successfully saved the notification sent from the payment gateway.
   * @return Boolean
   */
  global Boolean isSuccess() {}

}