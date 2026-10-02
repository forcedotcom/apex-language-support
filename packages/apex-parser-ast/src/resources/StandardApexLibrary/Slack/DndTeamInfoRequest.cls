global class DndTeamInfoRequest {
    global static Slack.DndTeamInfoRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getTeamId() { return null; }

    global List getUsers() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.DndTeamInfoRequest build() { return null; }

        global Slack.DndTeamInfoRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.DndTeamInfoRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.DndTeamInfoRequest.Builder users(List users) { return null; }
    }
}