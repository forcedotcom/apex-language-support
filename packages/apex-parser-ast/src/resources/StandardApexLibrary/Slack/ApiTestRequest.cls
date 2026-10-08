global class ApiTestRequest {
    global static Slack.ApiTestRequest.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global String getFoo() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.ApiTestRequest build() { return null; }

        global Slack.ApiTestRequest.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.ApiTestRequest.Builder error(String error) { return null; }

        global Slack.ApiTestRequest.Builder foo(String foo) { return null; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }
}