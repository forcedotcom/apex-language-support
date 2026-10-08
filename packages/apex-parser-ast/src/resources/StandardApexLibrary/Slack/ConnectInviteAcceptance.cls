global class ConnectInviteAcceptance {
    global ConnectInviteAcceptance() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.ConnectTeam getAcceptingTeam() { return null; }

    global Slack.ConnectUser getAcceptingUser() { return null; }

    global String getApprovalStatus() { return null; }

    global Integer getDateAccepted() { return 0; }

    global Integer getDateInvalid() { return 0; }

    global Integer getDateLastUpdated() { return 0; }

    global List getReviews() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setAcceptingTeam(Slack.ConnectTeam acceptingTeam) { }

    global void setAcceptingUser(Slack.ConnectUser acceptingUser) { }

    global void setApprovalStatus(String approvalStatus) { }

    global void setDateAccepted(Integer dateAccepted) { }

    global void setDateInvalid(Integer dateInvalid) { }

    global void setDateLastUpdated(Integer dateLastUpdated) { }

    global void setReviews(List reviews) { }

    global override String toString() { return null; }
}