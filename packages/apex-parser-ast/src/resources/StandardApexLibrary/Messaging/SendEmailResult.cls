/**
 * Contains the result of sending an email message.
 * <p>Usage
 */
global class SendEmailResult {
    global List errors { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    global List getErrors() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Indicates whether the email was successfully submitted for delivery (true) or not (false). Even if isSuccess is true, it does not mean the intended recipients received the email, as there could have been a problem with the email address or it could have bounced or been blocked by a spam blocker.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}