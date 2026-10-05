global class TeamAccessLogsResponse {
    global TeamAccessLogsResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global List getLogins() { return null; }

    global String getNeeded() { return null; }

    global Slack.Paging getPaging() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setLogins(List logins) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setPaging(Slack.Paging paging) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}