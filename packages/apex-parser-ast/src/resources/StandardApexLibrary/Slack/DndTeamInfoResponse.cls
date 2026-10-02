global class DndTeamInfoResponse {
    global Object DndTeamInfoResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global Map getUsers() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setUsers(Map users) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class DndTeamMemberInfo {
        global Object DndTeamMemberInfo() { return null; }

        global Slack.DndTeamInfoResponse.DndTeamMemberInfo clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Integer getNextDndEndTs() { return 0; }

        global Integer getNextDndStartTs() { return 0; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isDndEnabled() { return false; }

        global void setDndEnabled(Boolean dndEnabled) { }

        global void setNextDndEndTs(Integer nextDndEndTs) { }

        global void setNextDndStartTs(Integer nextDndStartTs) { }

        global override virtual String toString() { return null; }
    }
}