/**
 * Contains methods to build and validate an instance of the Messaging.ActionResult class.
 */
global class Builder {

  public Messaging.ActionResult build() {}

  public Messaging.ActionResult.Builder withErrorCode(Messaging.ActionError errorCode) {}

  public Messaging.ActionResult.Builder withMessage(String message) {}

  public Messaging.ActionResult.Builder withSuccess(Boolean success) {}

}