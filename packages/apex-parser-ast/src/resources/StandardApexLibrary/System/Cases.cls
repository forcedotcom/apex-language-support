/**
 * Use the Cases class to interact with case records.
 */
global class Cases {
    global Object Cases() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static String generateThreadingMessageId(Id caseId) { return null; }

    global static Id getCaseIdFromEmailHeaders(List headers) { return null; }

    global static Id getCaseIdFromEmailThreadId(String emailThreadId) { return null; }

    global virtual Integer hashCode() { return 0; }

    global static Boolean reparentFeedToCaseId(Id feedItemId, Id currentCaseId, Id correctCaseId) { return false; }

    global override virtual String toString() { return null; }
}