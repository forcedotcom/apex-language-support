global class AuthTeamsListResponse {
    global Object AuthTeamsListResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global Slack.ResponseMetadata getResponseMetadata() { return null; }

    global List getTeams() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) { }

    global void setTeams(List teams) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Team {
        global Object Team() { return null; }

        global Slack.AuthTeamsListResponse.Team clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setId(String id) { }

        global void setName(String name) { }

        global override virtual String toString() { return null; }
    }
}