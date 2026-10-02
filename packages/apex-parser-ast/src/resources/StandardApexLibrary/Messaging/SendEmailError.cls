/**
 * Represents an error that the SendEmailResult object may contain.
 * <p>Usage
 * Important
 * Sending an email by using Apex requires domain-level and user-level email verification. System-generated emails also require verification of the From email address. Email delivery fails if any of these verifications is incomplete. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.security_email_verification_requirements.htm&amp;language=en_US&amp;type=5" target="_blank">Requirements to Send Email from Salesforce</a>.
 */
global class SendEmailError extends Database.Error {
    global String message { get; }
    global System.StatusCode statuscode { get; }
    global String targetobjectid { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * A list of one or more field names. Identifies which fields in the object, if any, affected the error condition.
     */
    global List getFields() { return null; }

    /**
     * The text of the error message.
     */
    global String getMessage() { return null; }

    /**
     * Returns a code that characterizes the error.
     * <p>Usage
     * The full list of status codes is available in the WSDL file for your organization. For more information about accessing the WSDL file for your organization, see Downloading Salesforce WSDLs and Client Authentication Certificates in the Salesforce online help.
     */
    global System.StatusCode getStatusCode() { return null; }

    /**
     * The ID of the target record for which the error occurred.
     */
    global String getTargetObjectId() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}