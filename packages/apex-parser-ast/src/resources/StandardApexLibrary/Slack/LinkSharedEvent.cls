global class LinkSharedEvent extends Slack.Event {
    global Object LinkSharedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getChannel() { return null; }

    global String getEventTs() { return null; }

    global List getLinks() { return null; }

    global String getMessageTs() { return null; }

    global String getSource() { return null; }

    global virtual String getSubtype() { return null; }

    global String getThreadTs() { return null; }

    global override String getType() { return null; }

    global String getUnfurlId() { return null; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isBotUserMember() { return false; }

    global void setBotUserMember(Boolean botUserMember) { }

    global void setChannel(String channel) { }

    global void setEventTs(String eventTs) { }

    global void setLinks(List links) { }

    global void setMessageTs(String messageTs) { }

    global void setSource(String source) { }

    global void setThreadTs(String threadTs) { }

    global void setUnfurlId(String unfurlId) { }

    global void setUser(String user) { }

    global override String toString() { return null; }

    global class Link {
        global Object Link() { return null; }

        global Slack.LinkSharedEvent.Link clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getDomain() { return null; }

        global String getUrl() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setDomain(String domain) { }

        global void setUrl(String url) { }

        global override virtual String toString() { return null; }
    }
}