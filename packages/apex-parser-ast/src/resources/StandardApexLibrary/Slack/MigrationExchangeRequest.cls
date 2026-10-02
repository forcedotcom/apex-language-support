global class MigrationExchangeRequest {
    global static Slack.MigrationExchangeRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getTeamId() { return null; }

    global List getUsers() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isToOld() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.MigrationExchangeRequest build() { return null; }

        global Slack.MigrationExchangeRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.MigrationExchangeRequest.Builder teamId(String teamId) { return null; }

        global Slack.MigrationExchangeRequest.Builder toOld(Boolean toOld) { return null; }

        global override virtual String toString() { return null; }

        global Slack.MigrationExchangeRequest.Builder users(List users) { return null; }
    }
}