/**
 * Throw this exception to customize error messages that appear on Discovery logins and Configurable Self-Registration pages. An error message can have up to 200 characters. Use custom error exceptions to localize error messages.
 * Include this exception in:
 * Auth.MyDomainLoginDiscoveryHandler to show a custom error message on the My Domain login page
 * Auth.LoginDiscoveryHandler to show an error message on the Experience Cloud site login page
 * Auth.ConfigurableSelfRegHandler to show an error message on the Experience Cloud site self-registration Verify page
 * The Verify page shows up if you configured self-registration with either an Email or Text Message verification method. If you didn’t set up sign-up with a verification method, the error message appears on the self-registration page.
 * To get the error message and write it to debug log, use the String getMessage().
 */
global class DiscoveryCustomErrorException extends Exception {
    global DiscoveryCustomErrorException() { }

    global DiscoveryCustomErrorException(Exception null) { }

    global DiscoveryCustomErrorException(String null) { }

    global DiscoveryCustomErrorException(String null, Exception null) { }

    global override virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the cause of the exception as an exception object.
     */
    global override virtual Exception getCause() { return null; }

    global override virtual List getDmlFieldNames(Integer index) { return null; }

    global override virtual List getDmlFields(Integer index) { return null; }

    global override virtual String getDmlId(Integer index) { return null; }

    global override virtual Integer getDmlIndex(Integer index) { return 0; }

    global override virtual String getDmlMessage(Integer index) { return null; }

    global override virtual String getDmlStatusCode(Integer index) { return null; }

    global override virtual System.StatusCode getDmlType(Integer index) { return null; }

    global virtual Map getInaccessibleFields() { return null; }

    global virtual Map getInaccessibleFields(Integer index) { return null; }

    /**
     * Returns the line number from where the exception was thrown.
     */
    global override virtual Integer getLineNumber() { return 0; }

    /**
     * Returns the error message that displays for the user.
     */
    global override virtual String getMessage() { return null; }

    global override virtual Integer getNumDml() { return 0; }

    /**
     * Returns the stack trace of a thrown exception as a string.
     */
    global override virtual String getStackTraceString() { return null; }

    /**
     * Returns the type of exception, such as DmlException, ListException, MathException, and so on.
     */
    global override virtual String getTypeName() { return null; }

    global override virtual Integer hashCode() { return 0; }

    /**
     * Sets the cause for this exception, if one hasn’t already been set.
     */
    global override virtual void initCause(Exception cause) { }

    /**
     * Sets the error message that displays for the user.
     */
    global override virtual void setMessage(String message) { }

    global virtual String toString() { return null; }
}