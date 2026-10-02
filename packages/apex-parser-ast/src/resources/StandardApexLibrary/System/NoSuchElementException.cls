/**
 * This exception is thrown if you try to access items that are outside the bounds of a list. This exception is used by the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_iterable.htm" target="_blank">Iterator</a> next method. For example, if iterator.hasNext() == false and you call iterator.next(), this exception is thrown. This exception is also used by the Apex Flex Queue methods and is thrown if you attempt to access a job at an invalid position in the flex queue.
 */
global class NoSuchElementException extends Exception {
    Object NoSuchElementException() { return null; }

    Object NoSuchElementException(Exception param1) { return null; }

    Object NoSuchElementException(String param1) { return null; }

    Object NoSuchElementException(String param1, Exception param2) { return null; }

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