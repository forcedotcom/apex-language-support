global class ConnectInviteReview {
    global Object ConnectInviteReview() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getDateReview() { return 0; }

    global Slack.ConnectTeam getReviewingTeam() { return null; }

    global String getType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setDateReview(Integer dateReview) { }

    global void setReviewingTeam(Slack.ConnectTeam reviewingTeam) { }

    global void setType(String type) { }

    global override String toString() { return null; }
}