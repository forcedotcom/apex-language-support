/**
 * Contains information about the execution of an actionable notification.
 */
global class ActionResult {

  global ActionResult() {}

  public Messaging.ActionError getErrorCode() {}

  public String getMessage() {}

  public Boolean isSuccess() {}

  global Object clone() {}

  /**
   * Contains methods to build and validate an instance of the Messaging.ActionResult class.
   */
  global class Builder {

    global Builder() {}

    public Messaging.ActionResult build() {}

    public Messaging.ActionResult.Builder withErrorCode(Messaging.ActionError errorCode) {}

    public Messaging.ActionResult.Builder withMessage(String message) {}

    public Messaging.ActionResult.Builder withSuccess(Boolean success) {}

    global Object clone() {}

  }

}