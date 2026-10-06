global class ConnectTeam {
    global ConnectTeam() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getAvatarBaseUrl() { return null; }

    global Integer getDateCreated() { return 0; }

    global String getDomain() { return null; }

    global Slack.TeamIcon getIcon() { return null; }

    global String getId() { return null; }

    global String getName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isVerified() { return false; }

    global void setAvatarBaseUrl(String avatarBaseUrl) { }

    global void setDateCreated(Integer dateCreated) { }

    global void setDomain(String domain) { }

    global void setIcon(Slack.TeamIcon icon) { }

    global void setId(String id) { }

    global void setName(String name) { }

    global void setVerified(Boolean isVerified) { }

    global override String toString() { return null; }
}