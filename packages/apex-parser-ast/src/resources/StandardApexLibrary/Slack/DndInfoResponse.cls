global class DndInfoResponse {
    global DndInfoResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global Integer getNextDndEndTs() { return 0; }

    global Integer getNextDndStartTs() { return 0; }

    global String getProvided() { return null; }

    global Integer getSnoozeEndtime() { return 0; }

    global Integer getSnoozeRemaining() { return 0; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isDndEnabled() { return false; }

    global Boolean isOk() { return false; }

    global Boolean isSnoozeEnabled() { return false; }

    global void setDndEnabled(Boolean dndEnabled) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setNextDndEndTs(Integer nextDndEndTs) { }

    global void setNextDndStartTs(Integer nextDndStartTs) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setSnoozeEnabled(Boolean snoozeEnabled) { }

    global void setSnoozeEndtime(Integer snoozeEndtime) { }

    global void setSnoozeRemaining(Integer snoozeRemaining) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}