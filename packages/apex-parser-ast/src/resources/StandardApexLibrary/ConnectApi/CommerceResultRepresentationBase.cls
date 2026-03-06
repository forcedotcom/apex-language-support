/**
 * Base cart calculate output class.
 */
global class CommerceResultRepresentationBase {

  /**
   * Message related to the request.
   */
  global String message;

  /**
   * Asynchronous processing status of the cart, if asynchronous processing is enabled for the store. This property returns Completed in Apex, because Apex operations always run synchronously.
   */
  global String status;

}