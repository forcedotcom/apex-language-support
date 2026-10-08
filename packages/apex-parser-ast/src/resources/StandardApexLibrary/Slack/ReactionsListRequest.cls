global class ReactionsListRequest {
    global static Slack.ReactionsListRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getCount() { return 0; }

    global String getCursor() { return null; }

    global Integer getLimit() { return 0; }

    global Integer getPage() { return 0; }

    global String getTeamId() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isFull() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ReactionsListRequest build() { return null; }

        global Slack.ReactionsListRequest.Builder clone() { return null; }

        global Slack.ReactionsListRequest.Builder count(Integer count) { return null; }

        global Slack.ReactionsListRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.ReactionsListRequest.Builder full(Boolean full) { return null; }

        global virtual Integer hashCode() { return 0; }

        global Slack.ReactionsListRequest.Builder limitValue(Integer limitValue) { return null; }

        global Slack.ReactionsListRequest.Builder page(Integer page) { return null; }

        global Slack.ReactionsListRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.ReactionsListRequest.Builder user(String user) { return null; }
    }
}