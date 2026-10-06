/**
 * Contains information about the execution of an actionable notification.
 * Usage
 * This ActionResult instance represents the successful execution of an actionable notification.
 * Messaging.ActionResult result =
 * new Messaging.ActionResult.Builder()
 * .withSuccess(true)
 * .withMessage('Action is executed successfully')
 * .build();
 *
 * This ActionResult instance represents the unsuccessful execution of an actionable notification.
 * Messaging.ActionResult result =
 * new Messaging.ActionResult.Builder()
 * .withSuccess(false)
 * .withMessage('Error updating case')
 * .withErrorCode(Messaging.ActionError.INTERNAL_ERROR)
 * .build();
 */
global class ActionResult {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * If an error occurred, returns an object that provides the error code and a description.
     */
    global Messaging.ActionError getErrorCode() { return null; }

    /**
     * Returns the success or error message that displays for the user.
     */
    global String getMessage() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the action executed successfully; otherwise returns false.
     */
    global Boolean isSuccess() { return false; }

    global override virtual String toString() { return null; }

    /**
     * Contains methods to build and validate an instance of the Messaging.ActionResult class.
     * Usage
     * See the example for the NotificationActionHandler Interface.
     */
    global class Builder {
        global Builder() { }

        /**
         * Validates and returns the action result instance created by using the ActionResult.Builder methods.
         */
        global Messaging.ActionResult build() { return null; }

        global Messaging.ActionResult.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }

        /**
         * Sets the error message associated with the action error.
         */
        global Messaging.ActionResult.Builder withErrorCode(Messaging.ActionError errorCode) { return null; }

        /**
         * Sets the success or error message associated with the execution of the action.
         */
        global Messaging.ActionResult.Builder withMessage(String message) { return null; }

        /**
         * Sets a Boolean that informs the user whether the execution of the action was successful (true) or not (false).
         */
        global Messaging.ActionResult.Builder withSuccess(Boolean success) { return null; }
    }
}