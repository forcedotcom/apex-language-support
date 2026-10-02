global class ConversationsCloseResponse {
    global Object ConversationsCloseResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Boolean getAlreadyClosed() { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global Boolean getNoOp() { return false; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setAlreadyClosed(Boolean alreadyClosed) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setNoOp(Boolean noOp) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}