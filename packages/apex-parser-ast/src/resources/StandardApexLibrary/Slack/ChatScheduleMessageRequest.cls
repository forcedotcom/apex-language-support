global class ChatScheduleMessageRequest {
    global static Slack.ChatScheduleMessageRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getAttachmentsAsString() { return null; }

    global String getChannel() { return null; }

    global String getParse() { return null; }

    global Integer getPostAt() { return 0; }

    global String getText() { return null; }

    global String getThreadTs() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isLinkNames() { return false; }

    global Boolean isReplyBroadcast() { return false; }

    global Boolean isUnfurlLinks() { return false; }

    global Boolean isUnfurlMedia() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ChatScheduleMessageRequest.Builder attachmentsAsString(String attachmentsAsString) { return null; }

        global Slack.ChatScheduleMessageRequest build() { return null; }

        global Slack.ChatScheduleMessageRequest.Builder channel(String channel) { return null; }

        global Slack.ChatScheduleMessageRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ChatScheduleMessageRequest.Builder linkNames(Boolean linkNames) { return null; }

        global Slack.ChatScheduleMessageRequest.Builder parse(String parse) { return null; }

        global Slack.ChatScheduleMessageRequest.Builder postAt(Integer postAt) { return null; }

        global Slack.ChatScheduleMessageRequest.Builder replyBroadcast(Boolean replyBroadcast) { return null; }

        global Slack.ChatScheduleMessageRequest.Builder text(String text) { return null; }

        global Slack.ChatScheduleMessageRequest.Builder threadTs(String threadTs) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ChatScheduleMessageRequest.Builder unfurlLinks(Boolean unfurlLinks) { return null; }

        global Slack.ChatScheduleMessageRequest.Builder unfurlMedia(Boolean unfurlMedia) { return null; }

        global Slack.ChatScheduleMessageRequest.Builder viewReference(Slack.ViewReference viewReference) { return null; }
    }
}