/**
 * Use the methods in the EmailMessages class to interact with emails and email threading.
 */
global class EmailMessages {
    global Object EmailMessages() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static String getFormattedThreadingToken(Id recordId) { return null; }

    global static Id getRecordIdFromEmail(String subject, String textBody, String htmlBody) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}