global class App {
    global virtual Boolean equals(Object o) { return false; }

    global static Slack.App getAppByKey(String key) { return null; }

    global static Slack.App getAppByName(String developerName) { return null; }

    global Slack.AppClient getAppClient() { return null; }

    global String getAppKey() { return null; }

    global Slack.BotClient getBotClientForTeam(String teamId) { return null; }

    @Deprecated
    global String getConnectedSalesforceUserId(String teamId, String slackUserId) { return null; }

    @Deprecated
    global Map getConnectedSalesforceUserIdMap(String teamId, List slackUserIds) { return null; }

    @Deprecated
    global String getConnectedSlackUserId(String teamId, String salesforceUserId) { return null; }

    @Deprecated
    global Map getConnectedSlackUserIdMap(String teamId, List salesforceUserIds) { return null; }

    global Slack.UserClient getUserClientForTeam(String teamId, String slackUserId) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}