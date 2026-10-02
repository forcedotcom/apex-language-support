global class ConversationsRepliesRequest {
    global static Slack.ConversationsRepliesRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getCursor() { return null; }

    global String getLatest() { return null; }

    global Integer getLimit() { return 0; }

    global String getOldest() { return null; }

    global String getTs() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isIncludeAllMetadata() { return false; }

    global Boolean isInclusive() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.ConversationsRepliesRequest build() { return null; }

        global Slack.ConversationsRepliesRequest.Builder channel(String channel) { return null; }

        global Slack.ConversationsRepliesRequest.Builder clone() { return null; }

        global Slack.ConversationsRepliesRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ConversationsRepliesRequest.Builder includeAllMetadata(Boolean includeAllMetadata) { return null; }

        global Slack.ConversationsRepliesRequest.Builder inclusive(Boolean inclusive) { return null; }

        global Slack.ConversationsRepliesRequest.Builder latest(String latest) { return null; }

        global Slack.ConversationsRepliesRequest.Builder limitValue(Integer limitValue) { return null; }

        global Slack.ConversationsRepliesRequest.Builder oldest(String oldest) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ConversationsRepliesRequest.Builder ts(String ts) { return null; }
    }
}