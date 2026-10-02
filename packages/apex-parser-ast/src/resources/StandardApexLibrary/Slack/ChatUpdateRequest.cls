global class ChatUpdateRequest {
    global static Slack.ChatUpdateRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getAttachmentsAsString() { return null; }

    global String getChannel() { return null; }

    global String getParse() { return null; }

    global String getText() { return null; }

    global String getTs() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isLinkNames() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.ChatUpdateRequest.Builder attachmentsAsString(String attachmentsAsString) { return null; }

        global Slack.ChatUpdateRequest.Builder blocksAsString(String blocksJson) { return null; }

        global Slack.ChatUpdateRequest build() { return null; }

        global Slack.ChatUpdateRequest.Builder channel(String channel) { return null; }

        global Slack.ChatUpdateRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ChatUpdateRequest.Builder linkNames(Boolean linkNames) { return null; }

        global Slack.ChatUpdateRequest.Builder parse(String parse) { return null; }

        global Slack.ChatUpdateRequest.Builder text(String text) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ChatUpdateRequest.Builder ts(String ts) { return null; }

        global Slack.ChatUpdateRequest.Builder viewReference(Slack.ViewReference viewReference) { return null; }
    }
}