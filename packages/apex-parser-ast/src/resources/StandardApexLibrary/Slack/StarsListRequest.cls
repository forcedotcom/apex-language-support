global class StarsListRequest {
    global static Slack.StarsListRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getCount() { return 0; }

    global String getCursor() { return null; }

    global Integer getLimit() { return 0; }

    global Integer getPage() { return 0; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.StarsListRequest build() { return null; }

        global Slack.StarsListRequest.Builder clone() { return null; }

        global Slack.StarsListRequest.Builder count(Integer count) { return null; }

        global Slack.StarsListRequest.Builder cursor(String cursor) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.StarsListRequest.Builder limitValue(Integer limitValue) { return null; }

        global Slack.StarsListRequest.Builder page(Integer page) { return null; }

        global Slack.StarsListRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}