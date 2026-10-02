global class ConversationsHistoryRequest {
    global static Slack.ConversationsHistoryRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getCursor() { return null; }

    global String getLatest() { return null; }

    global Integer getLimit() { return 0; }

    global String getOldest() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isIncludeAllMetadata() { return false; }

    global Boolean isInclusive() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.ConversationsHistoryRequest build() { return null; }

        global Slack.ConversationsHistoryRequest.Builder channel(String channel) { return null; }

        global Slack.ConversationsHistoryRequest.Builder clone() { return null; }

        global Slack.ConversationsHistoryRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ConversationsHistoryRequest.Builder includeAllMetadata(Boolean includeAllMetadata) { return null; }

        global Slack.ConversationsHistoryRequest.Builder inclusive(Boolean inclusive) { return null; }

        global Slack.ConversationsHistoryRequest.Builder latest(String latest) { return null; }

        global Slack.ConversationsHistoryRequest.Builder limitValue(Integer limitValue) { return null; }

        global Slack.ConversationsHistoryRequest.Builder oldest(String oldest) { return null; }

        global override virtual String toString() { return null; }
    }
}