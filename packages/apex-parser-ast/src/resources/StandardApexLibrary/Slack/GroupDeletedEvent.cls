global class GroupDeletedEvent extends Slack.Event {
    global Object GroupDeletedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getActorId() { return null; }

    global String getChannel() { return null; }

    global Integer getDateDeleted() { return 0; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setActorId(String actorId) { }

    global void setChannel(String channel) { }

    global void setDateDeleted(Integer dateDeleted) { }

    global void setEventTs(String eventTs) { }

    global override String toString() { return null; }
}