global class UsergroupsListRequest {
    global static Slack.UsergroupsListRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isIncludeCount() { return false; }

    global Boolean isIncludeDisabled() { return false; }

    global Boolean isIncludeUsers() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.UsergroupsListRequest build() { return null; }

        global Slack.UsergroupsListRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.UsergroupsListRequest.Builder includeCount(Boolean includeCount) { return null; }

        global Slack.UsergroupsListRequest.Builder includeDisabled(Boolean includeDisabled) { return null; }

        global Slack.UsergroupsListRequest.Builder includeUsers(Boolean includeUsers) { return null; }

        global Slack.UsergroupsListRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}