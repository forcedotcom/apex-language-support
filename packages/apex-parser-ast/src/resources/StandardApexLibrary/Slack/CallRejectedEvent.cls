global class CallRejectedEvent extends Slack.Event {
    global Object CallRejectedEvent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getCallId() { return null; }

    global String getChannelId() { return null; }

    global String getExternalUniqueId() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global String getUserId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setCallId(String callId) { }

    global void setChannelId(String channelId) { }

    global void setExternalUniqueId(String externalUniqueId) { }

    global void setUserId(String userId) { }

    global override String toString() { return null; }
}