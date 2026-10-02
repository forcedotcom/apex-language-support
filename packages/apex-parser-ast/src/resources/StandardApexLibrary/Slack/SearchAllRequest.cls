global class SearchAllRequest {
    global static Slack.SearchAllRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getCount() { return 0; }

    global Integer getPage() { return 0; }

    global String getQuery() { return null; }

    global String getSort() { return null; }

    global String getSortDir() { return null; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isHighlight() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.SearchAllRequest build() { return null; }

        global Slack.SearchAllRequest.Builder clone() { return null; }

        global Slack.SearchAllRequest.Builder count(Integer count) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.SearchAllRequest.Builder highlight(Boolean highlight) { return null; }

        global Slack.SearchAllRequest.Builder page(Integer page) { return null; }

        global Slack.SearchAllRequest.Builder query(String query) { return null; }

        global Slack.SearchAllRequest.Builder sortDir(String sortDir) { return null; }

        global Slack.SearchAllRequest.Builder sortValue(String sortValue) { return null; }

        global Slack.SearchAllRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}