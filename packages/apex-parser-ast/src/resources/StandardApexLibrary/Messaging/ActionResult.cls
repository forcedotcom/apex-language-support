/**
 * Contains information about the execution of an actionable notification.
 */
global class ActionResult {

  global ActionResult() {}

  global Messaging.ActionError getErrorCode() {}

  global String getMessage() {}

  global Boolean isSuccess() {}

  global Object clone() {}

  /**
   * Contains methods to build and validate an instance of the Messaging.ActionResult class.
   */
  global class Builder {

    global Builder() {}

    global Messaging.ActionResult build() {}

    global Messaging.ActionResult.Builder withErrorCode(Messaging.ActionError errorCode) {}

    global Messaging.ActionResult.Builder withMessage(String message) {}

    global Messaging.ActionResult.Builder withSuccess(Boolean success) {}

    global Object clone() {}

  }

}