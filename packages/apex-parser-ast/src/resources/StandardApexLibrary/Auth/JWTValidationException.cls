/**
 * Throws this exception to indicate failure to validate a JWT using methods in the JWTUtil class. This exception occurs during the OAuth 2.0 token exchange flow in these scenarios.
 * Can’t parse the JWT
 * Can’t validate the JWT using a certificate, a public key, or the remote keys endpoint, depending on which method you use
 */
global class JWTValidationException extends Exception {
    global Object JWTValidationException() { return null; }

    global Object JWTValidationException(Exception null) { return null; }

    global Object JWTValidationException(String message) { return null; }

    global Object JWTValidationException(String null, Exception null) { return null; }

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