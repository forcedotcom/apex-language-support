global class ChatPostMessageRequest {
    global static Slack.ChatPostMessageRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getAttachmentsAsString() { return null; }

    global String getChannel() { return null; }

    global String getIconEmoji() { return null; }

    global String getIconUrl() { return null; }

    global String getParse() { return null; }

    global String getText() { return null; }

    global String getThreadTs() { return null; }

    global String getUsername() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isLinkNames() { return false; }

    global Boolean isMrkdwn() { return false; }

    global Boolean isReplyBroadcast() { return false; }

    global Boolean isUnfurlLinks() { return false; }

    global Boolean isUnfurlMedia() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ChatPostMessageRequest.Builder attachmentsAsString(String attachmentsAsString) { return null; }

        global Slack.ChatPostMessageRequest.Builder blocksAsString(String blocksJson) { return null; }

        global Slack.ChatPostMessageRequest build() { return null; }

        global Slack.ChatPostMessageRequest.Builder channel(String channel) { return null; }

        global Slack.ChatPostMessageRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ChatPostMessageRequest.Builder iconEmoji(String iconEmoji) { return null; }

        global Slack.ChatPostMessageRequest.Builder iconUrl(String iconUrl) { return null; }

        global Slack.ChatPostMessageRequest.Builder linkNames(Boolean linkNames) { return null; }

        global Slack.ChatPostMessageRequest.Builder mrkdwn(Boolean mrkdwn) { return null; }

        global Slack.ChatPostMessageRequest.Builder parse(String parse) { return null; }

        global Slack.ChatPostMessageRequest.Builder replyBroadcast(Boolean replyBroadcast) { return null; }

        global Slack.ChatPostMessageRequest.Builder text(String text) { return null; }

        global Slack.ChatPostMessageRequest.Builder threadTs(String threadTs) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ChatPostMessageRequest.Builder unfurlLinks(Boolean unfurlLinks) { return null; }

        global Slack.ChatPostMessageRequest.Builder unfurlMedia(Boolean unfurlMedia) { return null; }

        global Slack.ChatPostMessageRequest.Builder username(String username) { return null; }

        global Slack.ChatPostMessageRequest.Builder viewReference(Slack.ViewReference viewReference) { return null; }
    }
}