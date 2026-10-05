/**
 * Any problem with email, such as failure to deliver. For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_forcecom_email_outbound.htm" target="_blank">Outbound Email</a>.
 */
global class EmailException extends Exception {
    global EmailException() { }

    global EmailException(Exception param1) { }

    global EmailException(String param1) { }

    global EmailException(String param1, Exception param2) { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the cause of the exception as an exception object.
     */
    global Exception getCause() { return null; }

    /**
     * Returns the names of the field or fields that caused the error described by the ith failed row.
     */
    global List getDmlFieldNames(Integer index) { return null; }

    /**
     * Returns the field token or tokens for the field or fields that caused the error described by the ith failed row. For more information on field tokens, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic.htm" target="_blank">Dynamic Apex</a>.
     */
    global List getDmlFields(Integer index) { return null; }

    /**
     * Returns the ID of the failed record that caused the error described by the ith failed row.
     */
    global String getDmlId(Integer index) { return null; }

    /**
     * Returns the original row position of the ith failed row.
     */
    global Integer getDmlIndex(Integer index) { return 0; }

    /**
     * Returns the user message for the ith failed row.
     */
    global String getDmlMessage(Integer index) { return null; }

    /**
     * Deprecated. Use getDmlType instead. Returns the Apex failure code for the ith failed row.
     */
    global String getDmlStatusCode(Integer index) { return null; }

    /**
     * Returns the value of the System.StatusCode enum. For an example, see getDmlType Example.
     * For more information about System.StatusCode, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_enums.htm" target="_blank">Enums</a>.
     */
    global System.StatusCode getDmlType(Integer index) { return null; }

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
     * Returns the number of failed rows for DML exceptions.
     */
    global Integer getNumDml() { return 0; }

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