global class AppRequestedEvent extends Slack.Event {
    global AppRequestedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.AppRequest getAppRequest() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setAppRequest(Slack.AppRequest appRequest) { }

    global override String toString() { return null; }
}