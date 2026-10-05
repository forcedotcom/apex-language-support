global class ChatMeMessageRequest {
    global static Slack.ChatMeMessageRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getText() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ChatMeMessageRequest build() { return null; }

        global Slack.ChatMeMessageRequest.Builder channel(String channel) { return null; }

        global Slack.ChatMeMessageRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ChatMeMessageRequest.Builder text(String text) { return null; }

        global override virtual String toString() { return null; }
    }
}