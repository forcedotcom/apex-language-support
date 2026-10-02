global class ConnectInviteDetail {
    global Object ConnectInviteDetail() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getDateCreated() { return 0; }

    global Integer getDateInvalid() { return 0; }

    global String getId() { return null; }

    global Slack.ConnectTeam getInvitingTeam() { return null; }

    global Slack.ConnectUser getInvitingUser() { return null; }

    global String getLink() { return null; }

    global String getRecipientEmail() { return null; }

    global String getRecipientUserId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setDateCreated(Integer dateCreated) { }

    global void setDateInvalid(Integer dateInvalid) { }

    global void setId(String id) { }

    global void setInvitingTeam(Slack.ConnectTeam invitingTeam) { }

    global void setInvitingUser(Slack.ConnectUser invitingUser) { }

    global void setLink(String link) { }

    global void setRecipientEmail(String recipientEmail) { }

    global void setRecipientUserId(String recipientUserId) { }

    global override String toString() { return null; }
}