global class UsergroupsUpdateRequest {
    global static Slack.UsergroupsUpdateRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global List getChannels() { return null; }

    global String getDescription() { return null; }

    global String getHandle() { return null; }

    global String getName() { return null; }

    global String getTeamId() { return null; }

    global String getUsergroup() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isIncludeCount() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.UsergroupsUpdateRequest build() { return null; }

        global Slack.UsergroupsUpdateRequest.Builder channels(List channels) { return null; }

        global Slack.UsergroupsUpdateRequest.Builder clone() { return null; }

        global Slack.UsergroupsUpdateRequest.Builder description(String description) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.UsergroupsUpdateRequest.Builder handle(String handle) { return null; }

        global virtual Integer hashCode() { return 0; }

        global Slack.UsergroupsUpdateRequest.Builder includeCount(Boolean includeCount) { return null; }

        global Slack.UsergroupsUpdateRequest.Builder name(String name) { return null; }

        global Slack.UsergroupsUpdateRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.UsergroupsUpdateRequest.Builder usergroup(String usergroup) { return null; }
    }
}