global class InviteRequestedEvent extends Slack.Event {
    global InviteRequestedEvent() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.InviteRequestedEvent.InviteRequest getInviteRequest() { return null; }

    global virtual String getSubtype() { return null; }

    global override String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setInviteRequest(Slack.InviteRequestedEvent.InviteRequest inviteRequest) { }

    global override String toString() { return null; }

    global class InviteRequest {
        global InviteRequest() { }

        global Slack.InviteRequestedEvent.InviteRequest clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getChannelIds() { return null; }

        global Integer getDateCreated() { return 0; }

        global Integer getDateExpire() { return 0; }

        global String getEmail() { return null; }

        global String getId() { return null; }

        global String getInviteType() { return null; }

        global String getRealName() { return null; }

        global String getRequestReason() { return null; }

        global List getRequesterIds() { return null; }

        global Slack.InviteRequestedEvent.Team getTeam() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannelIds(List channelIds) { }

        global void setDateCreated(Integer dateCreated) { }

        global void setDateExpire(Integer dateExpire) { }

        global void setEmail(String email) { }

        global void setId(String id) { }

        global void setInviteType(String inviteType) { }

        global void setRealName(String realName) { }

        global void setRequestReason(String requestReason) { }

        global void setRequesterIds(List requesterIds) { }

        global void setTeam(Slack.InviteRequestedEvent.Team team) { }

        global override virtual String toString() { return null; }
    }

    global class Team {
        global Team() { }

        global Slack.InviteRequestedEvent.Team clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getDomain() { return null; }

        global String getId() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setDomain(String domain) { }

        global void setId(String id) { }

        global void setName(String name) { }

        global override virtual String toString() { return null; }
    }
}