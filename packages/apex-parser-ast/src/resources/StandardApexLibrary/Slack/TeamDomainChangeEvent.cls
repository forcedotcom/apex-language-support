global class TeamDomainChangeEvent extends Slack.Event {
    global TeamDomainChangeEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getDomain() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUrl() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setDomain(String domain) { }

    global void setUrl(String url) { }

    global override String toString() { return null; }
}