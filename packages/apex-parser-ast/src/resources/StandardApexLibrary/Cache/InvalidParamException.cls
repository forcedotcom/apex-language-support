/**
 * An invalid parameter value is passed into a method of Cache.Session or Cache.Org. This error occurs when:
 * The key referenced is null or empty or is not alphanumeric.
 * The key isn’t qualified with the namespace and partition in the format <namespace>.<partition>.<key>.
 * The key isn’t qualified in the format <key> for the default partition, or for a key inserted through the partition object.
 * The namespace referenced is null or empty.
 * The partition name is null or empty or is not alphanumeric.
 * Another referenced value is null.
 */
global class InvalidParamException extends cache.CacheException {
    global Object InvalidParamException() { return null; }

    global Object InvalidParamException(Exception null) { return null; }

    global Object InvalidParamException(String null) { return null; }

    global Object InvalidParamException(String null, Exception null) { return null; }

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