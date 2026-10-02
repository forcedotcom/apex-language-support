/**
 * Any problem with SOQL queries, such as assigning a query that returns no records or more than one record to a singleton sObject variable.
 */
global class QueryException extends Exception {
    Object QueryException() { return null; }

    Object QueryException(Exception param1) { return null; }

    Object QueryException(String param1) { return null; }

    Object QueryException(String param1, Exception param2) { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the cause of the exception as an exception object.
     */
    global Exception getCause() { return null; }

    global Map getInaccessibleFields() { return null; }

    /**
     * Returns the line number from where the exception was thrown.
     */
    global Integer getLineNumber() { return 0; }

    /**
     * Returns the error message that displays for the user.
     */
    global String getMessage() { return null; }

    /**
     * Returns the stack trace of a thrown exception as a string.
     */
    global String getStackTraceString() { return null; }

    /**
     * Returns the type of exception, such as DmlException, ListException, MathException, and so on.
     */
    global String getTypeName() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Sets the cause for this exception, if one hasn’t already been set.
     */
    global void initCause(Exception cause) { }

    /**
     * Sets the error message that displays for the user.
     */
    global void setMessage(String message) { }

    global String toString() { return null; }
}