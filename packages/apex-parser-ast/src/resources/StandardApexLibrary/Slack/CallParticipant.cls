global class CallParticipant {
    global CallParticipant() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getAvatarUrl() { return null; }

    global String getDisplayName() { return null; }

    global String getExternalId() { return null; }

    global String getSlackId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setAvatarUrl(String avatarUrl) { }

    global void setDisplayName(String displayName) { }

    global void setExternalId(String externalId) { }

    global void setSlackId(String slackId) { }

    global override String toString() { return null; }
}