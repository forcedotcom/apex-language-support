global class FilesInfoResponse {
    global FilesInfoResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getContent() { return null; }

    global String getContentHighlightCss() { return null; }

    global String getContentHighlightHtml() { return null; }

    global String getError() { return null; }

    global Slack.File getFile() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global Boolean isTruncated() { return false; }

    global void setContent(String content) { }

    global void setContentHighlightCss(String contentHighlightCss) { }

    global void setContentHighlightHtml(String contentHighlightHtml) { }

    global void setError(String error) { }

    global void setFile(Slack.File file) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setTruncated(Boolean truncated) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}