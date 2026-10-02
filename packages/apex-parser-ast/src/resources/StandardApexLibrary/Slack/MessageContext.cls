global class MessageContext {
    global virtual Boolean equals(Object o) { return false; }

    global String getText() { return null; }

    global String getThreadTs() { return null; }

    global String getTs() { return null; }

    global String getUserId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.MessageContext build() { return null; }

        global Slack.MessageContext.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.MessageContext.Builder text(String text) { return null; }

        global Slack.MessageContext.Builder threadTs(String threadTs) { return null; }

        global override virtual String toString() { return null; }

        global Slack.MessageContext.Builder ts(String ts) { return null; }

        global Slack.MessageContext.Builder userId(String userId) { return null; }
    }
}