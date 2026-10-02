global class DndSetSnoozeResponse {
    global Object DndSetSnoozeResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global Integer getSnoozeEndtime() { return 0; }

    global Integer getSnoozeRemaining() { return 0; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global Boolean isSnoozeEnabled() { return false; }

    global Boolean isSnoozeIsIndefinite() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setSnoozeEnabled(Boolean snoozeEnabled) { }

    global void setSnoozeEndtime(Integer snoozeEndtime) { }

    global void setSnoozeIsIndefinite(Boolean snoozeIsIndefinite) { }

    global void setSnoozeRemaining(Integer snoozeRemaining) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }
}