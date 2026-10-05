global class ConversationsInfoRequest {
    global static Slack.ConversationsInfoRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isIncludeLocale() { return false; }

    global Boolean isIncludeNumMembers() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ConversationsInfoRequest build() { return null; }

        global Slack.ConversationsInfoRequest.Builder channel(String channel) { return null; }

        global Slack.ConversationsInfoRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ConversationsInfoRequest.Builder includeLocale(Boolean includeLocale) { return null; }

        global Slack.ConversationsInfoRequest.Builder includeNumMembers(Boolean includeNumMembers) { return null; }

        global override virtual String toString() { return null; }
    }
}