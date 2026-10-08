global class AppsEventAuthorizationsListResponse {
    global AppsEventAuthorizationsListResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global List getAuthorizations() { return null; }

    global String getCursorNext() { return null; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setAuthorizations(List authorizations) { }

    global void setCursorNext(String cursorNext) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Authorization {
        global Authorization() { }

        global Slack.AppsEventAuthorizationsListResponse.Authorization clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getEnterpriseId() { return null; }

        global Boolean getIsBot() { return false; }

        global Boolean getIsEnterpriseInstall() { return false; }

        global String getTeamId() { return null; }

        global String getUserId() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setEnterpriseId(String enterpriseId) { }

        global void setIsBot(Boolean isBot) { }

        global void setIsEnterpriseInstall(Boolean isEnterpriseInstall) { }

        global void setTeamId(String teamId) { }

        global void setUserId(String userId) { }

        global override virtual String toString() { return null; }
    }
}