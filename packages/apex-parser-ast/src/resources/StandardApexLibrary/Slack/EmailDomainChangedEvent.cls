global class EmailDomainChangedEvent extends Slack.Event {
    global EmailDomainChangedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getEmailDomain() { return null; }

    global String getEventTs() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setEmailDomain(String emailDomain) { }

    global void setEventTs(String eventTs) { }

    global override String toString() { return null; }
}