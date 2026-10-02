global class Usergroup {
    global Object Usergroup() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getAutoType() { return null; }

    global Integer getChannelCount() { return 0; }

    global String getCreatedBy() { return null; }

    global Integer getDateCreate() { return 0; }

    global Integer getDateDelete() { return 0; }

    global Integer getDateUpdate() { return 0; }

    global String getDeletedBy() { return null; }

    global String getDescription() { return null; }

    global String getEnterpriseSubteamId() { return null; }

    global String getHandle() { return null; }

    global String getId() { return null; }

    global String getName() { return null; }

    global Slack.Usergroup.Prefs getPrefs() { return null; }

    global String getTeamId() { return null; }

    global String getUpdatedBy() { return null; }

    global Integer getUserCount() { return 0; }

    global List getUsers() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isAutoProvision() { return false; }

    global Boolean isExternal() { return false; }

    global Boolean isSubteam() { return false; }

    global Boolean isUsergroup() { return false; }

    global void setAutoProvision(Boolean autoProvision) { }

    global void setAutoType(String autoType) { }

    global void setChannelCount(Integer channelCount) { }

    global void setCreatedBy(String createdBy) { }

    global void setDateCreate(Integer dateCreate) { }

    global void setDateDelete(Integer dateDelete) { }

    global void setDateUpdate(Integer dateUpdate) { }

    global void setDeletedBy(String deletedBy) { }

    global void setDescription(String description) { }

    global void setEnterpriseSubteamId(String enterpriseSubteamId) { }

    global void setExternal(Boolean external) { }

    global void setHandle(String handle) { }

    global void setId(String id) { }

    global void setName(String name) { }

    global void setPrefs(Slack.Usergroup.Prefs prefs) { }

    global void setSubteam(Boolean subteam) { }

    global void setTeamId(String teamId) { }

    global void setUpdatedBy(String updatedBy) { }

    global void setUserCount(Integer userCount) { }

    global void setUsergroup(Boolean usergroup) { }

    global void setUsers(List users) { }

    global override String toString() { return null; }

    global class Prefs {
        global Object Prefs() { return null; }

        global Slack.Usergroup.Prefs clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getChannels() { return null; }

        global List getGroups() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannels(List channels) { }

        global void setGroups(List groups) { }

        global override virtual String toString() { return null; }
    }
}