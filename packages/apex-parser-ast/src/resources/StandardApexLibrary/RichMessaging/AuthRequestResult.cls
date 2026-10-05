/**
 * This class contains the result from handling the authorization request response.
 */
global class AuthRequestResult {
    /**
     * The expiration date and time.
     * <p>Datetime
     */
    global Datetime expirationDateTime;
    /**
     * The reference to the redirect page.
     * <p>System.PageReference
     */
    global System.PageReference redirectPageReference;
    /**
     * The result status value.
     * <p>RichMessaging.AuthRequestResultStatus
     */
    global RichMessaging.AuthRequestResultStatus resultStatus;

    /**
     * Creates a new instance of the RichMessaging.AuthRequestResult class.
     */
    global AuthRequestResult(System.PageReference redirectPageReference, RichMessaging.AuthRequestResultStatus resultStatus, Datetime expirationDateTime) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}