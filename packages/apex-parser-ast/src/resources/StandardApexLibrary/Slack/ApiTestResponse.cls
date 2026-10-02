global class ApiTestResponse {
    global Object ApiTestResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.ApiTestResponse.Args getArgs() { return null; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setArgs(Slack.ApiTestResponse.Args args) { }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Args {
        global Object Args() { return null; }

        global Slack.ApiTestResponse.Args clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getError() { return null; }

        global String getFoo() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setError(String error) { }

        global void setFoo(String foo) { }

        global override virtual String toString() { return null; }
    }
}