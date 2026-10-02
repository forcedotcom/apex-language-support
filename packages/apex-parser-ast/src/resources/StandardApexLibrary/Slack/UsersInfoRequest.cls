global class UsersInfoRequest {
    global static Slack.UsersInfoRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isIncludeLocale() { return false; }

    global override String toString() { return null; }

    global class Builder {
        global Object Builder() { return null; }

        global Slack.UsersInfoRequest build() { return null; }

        global Slack.UsersInfoRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Slack.UsersInfoRequest.Builder includeLocale(Boolean includeLocale) { return null; }

        global override virtual String toString() { return null; }

        global Slack.UsersInfoRequest.Builder user(String user) { return null; }
    }
}