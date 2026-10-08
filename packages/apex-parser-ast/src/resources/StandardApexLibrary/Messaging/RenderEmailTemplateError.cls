/**
 * Represents an error that the RenderEmailTemplateBodyResult object can contain.
 */
global class RenderEmailTemplateError {
    global String fieldname { get; }
    global String message { get; }
    global Integer offset { get; }
    global System.StatusCode statuscode { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the name of the merge field in the error.
     */
    global String getFieldName() { return null; }

    /**
     * Returns a message describing the error.
     */
    global String getMessage() { return null; }

    /**
     * Returns the offset within the supplied body text where the error was discovered. If the offset cannot be determined, -1 is returned.
     */
    global Integer getOffset() { return 0; }

    /**
     * Returns a Salesforce API status code.
     */
    global System.StatusCode getStatusCode() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}