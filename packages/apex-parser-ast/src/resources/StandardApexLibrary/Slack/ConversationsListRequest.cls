global class ConversationsListRequest {
    global static Slack.ConversationsListRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getCursor() { return null; }

    global Integer getLimit() { return 0; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isExcludeArchived() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.ConversationsListRequest build() { return null; }

        global Slack.ConversationsListRequest.Builder clone() { return null; }

        global Slack.ConversationsListRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.ConversationsListRequest.Builder excludeArchived(Boolean excludeArchived) { return null; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ConversationsListRequest.Builder limitValue(Integer limitValue) { return null; }

        global Slack.ConversationsListRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ConversationsListRequest.Builder types(List types) { return null; }
    }
}