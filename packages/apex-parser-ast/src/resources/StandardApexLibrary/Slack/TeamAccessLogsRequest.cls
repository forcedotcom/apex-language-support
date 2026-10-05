global class TeamAccessLogsRequest {
    global static Slack.TeamAccessLogsRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getBefore() { return 0; }

    global Integer getCount() { return 0; }

    global Integer getPage() { return 0; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.TeamAccessLogsRequest.Builder before(Integer before) { return null; }

        global Slack.TeamAccessLogsRequest build() { return null; }

        global Slack.TeamAccessLogsRequest.Builder clone() { return null; }

        global Slack.TeamAccessLogsRequest.Builder count(Integer count) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.TeamAccessLogsRequest.Builder page(Integer page) { return null; }

        global Slack.TeamAccessLogsRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}