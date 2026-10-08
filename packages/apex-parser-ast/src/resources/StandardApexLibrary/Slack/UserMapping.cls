global class UserMapping {
    global UserMapping(String salesforceId, String slackUserId) { }

    global virtual Boolean equals(Object o) { return false; }

    global String getSalesforceUserId() { return null; }

    global String getSlackUserId() { return null; }

    global virtual Integer hashCode() { return 0; }
}