global class UsersConversationsRequest {
    global static Slack.UsersConversationsRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getCursor() { return null; }

    global Integer getLimit() { return 0; }

    global String getTeamId() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isExcludeArchived() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.UsersConversationsRequest build() { return null; }

        global Slack.UsersConversationsRequest.Builder clone() { return null; }

        global Slack.UsersConversationsRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.UsersConversationsRequest.Builder excludeArchived(Boolean excludeArchived) { return null; }

        global virtual Integer hashCode() { return 0; }

        global Slack.UsersConversationsRequest.Builder limitValue(Integer limitValue) { return null; }

        global Slack.UsersConversationsRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.UsersConversationsRequest.Builder types(List types) { return null; }

        global Slack.UsersConversationsRequest.Builder user(String user) { return null; }
    }
}