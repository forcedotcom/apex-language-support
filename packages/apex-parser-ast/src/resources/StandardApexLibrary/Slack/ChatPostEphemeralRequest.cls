global class ChatPostEphemeralRequest {
    global static Slack.ChatPostEphemeralRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getAttachmentsAsString() { return null; }

    global String getChannel() { return null; }

    global String getIconEmoji() { return null; }

    global String getIconUrl() { return null; }

    global String getParse() { return null; }

    global String getText() { return null; }

    global String getThreadTs() { return null; }

    global String getUser() { return null; }

    global String getUsername() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isLinkNames() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.ChatPostEphemeralRequest.Builder attachmentsAsString(String attachmentsAsString) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder blocksAsString(String blocksJson) { return null; }

        global Slack.ChatPostEphemeralRequest build() { return null; }

        global Slack.ChatPostEphemeralRequest.Builder channel(String channel) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ChatPostEphemeralRequest.Builder iconEmoji(String iconEmoji) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder iconUrl(String iconUrl) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder linkNames(Boolean linkNames) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder parse(String parse) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder text(String text) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder threadTs(String threadTs) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ChatPostEphemeralRequest.Builder user(String user) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder username(String username) { return null; }

        global Slack.ChatPostEphemeralRequest.Builder viewReference(Slack.ViewReference viewReference) { return null; }
    }
}