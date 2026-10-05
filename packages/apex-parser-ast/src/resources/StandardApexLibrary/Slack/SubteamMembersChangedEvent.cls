global class SubteamMembersChangedEvent extends Slack.Event {
    global SubteamMembersChangedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global List getAddedUsers() { return null; }

    global Integer getAddedUsersCount() { return 0; }

    global Integer getDatePreviousUpdate() { return 0; }

    global Integer getDateUpdate() { return 0; }

    global String getEventTs() { return null; }

    global List getRemovedUsers() { return null; }

    global Integer getRemovedUsersCount() { return 0; }

    global String getSubteamId() { return null; }

    global virtual String getSubtype() { return null; }

    global String getTeamId() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setAddedUsers(List addedUsers) { }

    global void setAddedUsersCount(Integer addedUsersCount) { }

    global void setDatePreviousUpdate(Integer datePreviousUpdate) { }

    global void setDateUpdate(Integer dateUpdate) { }

    global void setEventTs(String eventTs) { }

    global void setRemovedUsers(List removedUsers) { }

    global void setRemovedUsersCount(Integer removedUsersCount) { }

    global void setSubteamId(String subteamId) { }

    global void setTeamId(String teamId) { }

    global override String toString() { return null; }
}