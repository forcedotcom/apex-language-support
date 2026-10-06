global class BotsInfoRequest {
    global static Slack.BotsInfoRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getBot() { return null; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.BotsInfoRequest.Builder bot(String bot) { return null; }

        global Slack.BotsInfoRequest build() { return null; }

        global Slack.BotsInfoRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.BotsInfoRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}