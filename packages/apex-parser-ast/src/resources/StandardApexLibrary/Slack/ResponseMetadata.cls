global class ResponseMetadata {
    global ResponseMetadata() { }

    global virtual Boolean equals(Object o) { return false; }

    global List getMessages() { return null; }

    global String getNextCursor() { return null; }

    global List getWarnings() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setMessages(List messages) { }

    global void setNextCursor(String nextCursor) { }

    global void setWarnings(List warnings) { }

    global override String toString() { return null; }
}