global class GroupHistoryChangedEvent extends Slack.Event {
    global GroupHistoryChangedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getEventTs() { return null; }

    global String getLatest() { return null; }

    global virtual String getSubtype() { return null; }

    global String getTs() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEventTs(String eventTs) { }

    global void setLatest(String latest) { }

    global void setTs(String ts) { }

    global override String toString() { return null; }
}