/**
 * Communicates with the payment platform regarding the gateway’s notification.
 */
global class NotificationClient {

  /**
   * Stores the results of a notification request.
   * @param notification 
   * @return commercepayments.NotificationSaveResult
   */
  global static commercepayments.NotificationSaveResult record(commercepayments.BaseNotification notification) {}

}