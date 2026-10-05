global class RequestContext {
    global virtual Boolean equals(Object o) { return false; }

    global Slack.ActionPayload getActionPayload() { return null; }

    global Slack.App getApp() { return null; }

    global String getAppId() { return null; }

    global String getChannelId() { return null; }

    global String getEnterpriseId() { return null; }

    global Map getFormData() { return null; }

    global Slack.MessageContext getMessageContext() { return null; }

    global String getTeamId() { return null; }

    global String getTriggerId() { return null; }

    global String getUserId() { return null; }

    global Slack.UserType getUserType() { return null; }

    global Slack.ViewContext getViewContext() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isDefaultOrg() { return false; }

    global override virtual String toString() { return null; }

    global class Builder {
        global Builder() { }

        global Slack.RequestContext.Builder actionPayload(Slack.ActionPayload actionPayload) { return null; }

        global Slack.RequestContext.Builder appId(String appId) { return null; }

        global Slack.RequestContext build() { return null; }

        global Slack.RequestContext.Builder channelId(String channelId) { return null; }

        global Slack.RequestContext.Builder clone() { return null; }

        global Slack.RequestContext.Builder enterpriseId(String enterpriseId) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.RequestContext.Builder formData(Map formData) { return null; }

        global virtual Integer hashCode() { return 0; }

        global Slack.RequestContext.Builder messageContext(Slack.MessageContext messageContext) { return null; }

        global Slack.RequestContext.Builder setIsDefaultOrg(Boolean isDefaultOrg) { return null; }

        global Slack.RequestContext.Builder teamId(String teamId) { return null; }

        global override virtual String toString() { return null; }

        global Slack.RequestContext.Builder triggerId(String triggerId) { return null; }

        global Slack.RequestContext.Builder userId(String userId) { return null; }

        global Slack.RequestContext.Builder userType(Slack.UserType userType) { return null; }

        global Slack.RequestContext.Builder viewContext(Slack.ViewContext viewContext) { return null; }
    }
}