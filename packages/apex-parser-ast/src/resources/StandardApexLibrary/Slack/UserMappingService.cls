global class UserMappingService {
    global UserMappingService() { }

    global virtual Boolean equals(Object o) { return false; }

    global static String getSalesforceUserId(String slackUserId) { return null; }

    global static Map getSalesforceUserIdMap(List slackUserIds) { return null; }

    global static String getSlackUserId(String salesforceUserId, String teamId) { return null; }

    global static Map getSlackUserIdMap(List salesforceUserIds, String teamId) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}