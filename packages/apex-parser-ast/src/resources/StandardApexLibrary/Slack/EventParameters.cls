global class EventParameters {
    global Object EventParameters(Slack.Event event, String eventId, Integer eventTime) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.Event getEvent() { return null; }

    global String getEventId() { return null; }

    global Integer getEventTime() { return 0; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}