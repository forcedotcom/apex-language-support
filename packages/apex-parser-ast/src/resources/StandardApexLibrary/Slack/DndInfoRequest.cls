global class DndInfoRequest {
    global static Slack.DndInfoRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getTeamId() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.DndInfoRequest build() { return null; }

        global Slack.DndInfoRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.DndInfoRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.DndInfoRequest.Builder user(String user) { return null; }
    }
}