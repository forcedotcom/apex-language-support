global class ConnectUser {
    global Object ConnectUser() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getId() { return null; }

    global String getName() { return null; }

    global Slack.ConnectUserProfile getProfile() { return null; }

    global String getTeamId() { return null; }

    global Integer getUpdated() { return 0; }

    global String getWhoCanShareContactCard() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setId(String id) { }

    global void setName(String name) { }

    global void setProfile(Slack.ConnectUserProfile profile) { }

    global void setTeamId(String teamId) { }

    global void setUpdated(Integer updated) { }

    global void setWhoCanShareContactCard(String whoCanShareContactCard) { }

    global override String toString() { return null; }
}