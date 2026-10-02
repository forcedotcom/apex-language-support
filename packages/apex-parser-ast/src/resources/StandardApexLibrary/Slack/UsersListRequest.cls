global class UsersListRequest {
    global static Slack.UsersListRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getCursor() { return null; }

    global Integer getLimit() { return 0; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isIncludeLocale() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.UsersListRequest build() { return null; }

        global Slack.UsersListRequest.Builder clone() { return null; }

        global Slack.UsersListRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.UsersListRequest.Builder includeLocale(Boolean includeLocale) { return null; }

        global Slack.UsersListRequest.Builder limitValue(Integer limitValue) { return null; }

        global Slack.UsersListRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}