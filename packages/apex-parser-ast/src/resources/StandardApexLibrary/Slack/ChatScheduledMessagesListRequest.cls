global class ChatScheduledMessagesListRequest {
    global static Slack.ChatScheduledMessagesListRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getCursor() { return null; }

    global String getLatest() { return null; }

    global Integer getLimit() { return 0; }

    global String getOldest() { return null; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ChatScheduledMessagesListRequest build() { return null; }

        global Slack.ChatScheduledMessagesListRequest.Builder channel(String channel) { return null; }

        global Slack.ChatScheduledMessagesListRequest.Builder clone() { return null; }

        global Slack.ChatScheduledMessagesListRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ChatScheduledMessagesListRequest.Builder latest(String latest) { return null; }

        global Slack.ChatScheduledMessagesListRequest.Builder limitValue(Integer limitValue) { return null; }

        global Slack.ChatScheduledMessagesListRequest.Builder oldest(String oldest) { return null; }

        global Slack.ChatScheduledMessagesListRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}