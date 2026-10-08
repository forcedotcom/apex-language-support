global class RemindersInfoRequest {
    global static Slack.RemindersInfoRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getReminder() { return null; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.RemindersInfoRequest build() { return null; }

        global Slack.RemindersInfoRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.RemindersInfoRequest.Builder reminder(String reminder) { return null; }

        global Slack.RemindersInfoRequest.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }
    }
}