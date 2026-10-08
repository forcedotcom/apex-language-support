global class BotProfile {
    global BotProfile() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getAppId() { return null; }

    global Slack.BotProfile.Icons getIcons() { return null; }

    global String getId() { return null; }

    global String getName() { return null; }

    global String getTeamId() { return null; }

    global Integer getUpdated() { return 0; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isDeleted() { return false; }

    global void setAppId(String appId) { }

    global void setDeleted(Boolean deleted) { }

    global void setIcons(Slack.BotProfile.Icons icons) { }

    global void setId(String id) { }

    global void setName(String name) { }

    global void setTeamId(String teamId) { }

    global void setUpdated(Integer updated) { }

    global override String toString() { return null; }

    global class Icons {
        global Icons() { }

        global Slack.BotProfile.Icons clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getImage36() { return null; }

        global String getImage48() { return null; }

        global String getImage72() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setImage36(String image36) { }

        global void setImage48(String image48) { }

        global void setImage72(String image72) { }

        global override virtual String toString() { return null; }
    }
}