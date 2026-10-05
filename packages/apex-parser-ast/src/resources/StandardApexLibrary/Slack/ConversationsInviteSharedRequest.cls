global class ConversationsInviteSharedRequest {
    global static Slack.ConversationsInviteSharedRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global List getEmails() { return null; }

    global Boolean getExternalLimited() { return false; }

    global List getUserIds() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ConversationsInviteSharedRequest build() { return null; }

        global Slack.ConversationsInviteSharedRequest.Builder channel(String channel) { return null; }

        global Slack.ConversationsInviteSharedRequest.Builder clone() { return null; }

        global Slack.ConversationsInviteSharedRequest.Builder emails(List emails) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.ConversationsInviteSharedRequest.Builder externalLimited(Boolean externalLimited) { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }

        global Slack.ConversationsInviteSharedRequest.Builder userIds(List userIds) { return null; }
    }
}