global class SearchMessagesRequest {
    global static Slack.SearchMessagesRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getCount() { return 0; }

    global String getCursor() { return null; }

    global Integer getPage() { return 0; }

    global String getQuery() { return null; }

    global String getSort() { return null; }

    global String getSortDir() { return null; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isHighlight() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.SearchMessagesRequest build() { return null; }

        global Slack.SearchMessagesRequest.Builder clone() { return null; }

        global Slack.SearchMessagesRequest.Builder count(Integer count) { return null; }

        global Slack.SearchMessagesRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.SearchMessagesRequest.Builder highlight(Boolean highlight) { return null; }

        global Slack.SearchMessagesRequest.Builder page(Integer page) { return null; }

        global Slack.SearchMessagesRequest.Builder query(String query) { return null; }

        global Slack.SearchMessagesRequest.Builder sortDir(String sortDir) { return null; }

        global Slack.SearchMessagesRequest.Builder sortValue(String sortValue) { return null; }

        global Slack.SearchMessagesRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}