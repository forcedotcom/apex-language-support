global class BookmarksListResponse {
    global BookmarksListResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global List getBookmarks() { return null; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global Slack.ErrorResponseMetadata getResponseMetadata() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setBookmarks(List bookmarks) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setResponseMetadata(Slack.ErrorResponseMetadata responseMetadata) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}