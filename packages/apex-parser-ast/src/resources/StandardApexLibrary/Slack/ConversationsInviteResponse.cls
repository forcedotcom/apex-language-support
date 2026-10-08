global class ConversationsInviteResponse {
    global ConversationsInviteResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.Conversation getChannel() { return null; }

    global String getError() { return null; }

    global List getErrors() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setChannel(Slack.Conversation channel) { }

    global void setError(String error) { }

    global void setErrors(List errors) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Error {
        global Error() { }

        global Slack.ConversationsInviteResponse.Error clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getError() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isOk() { return false; }

        global void setError(String error) { }

        global void setOk(Boolean ok) { }

        global override virtual String toString() { return null; }
    }
}