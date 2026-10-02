global class ConversationsOpenRequest {
    global static Slack.ConversationsOpenRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global List getUsers() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isReturnIm() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.ConversationsOpenRequest build() { return null; }

        global Slack.ConversationsOpenRequest.Builder channel(String channel) { return null; }

        global Slack.ConversationsOpenRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ConversationsOpenRequest.Builder returnIm(Boolean returnIm) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ConversationsOpenRequest.Builder users(List users) { return null; }
    }
}