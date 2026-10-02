global class SearchAllResponse {
    global Object SearchAllResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Slack.SearchResult getFiles() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global Slack.SearchResult getMessages() { return null; }

    global String getNeeded() { return null; }

    global Slack.SearchAllResponse.Posts getPosts() { return null; }

    global String getProvided() { return null; }

    global String getQuery() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setFiles(Slack.SearchResult files) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setMessages(Slack.SearchResult messages) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setPosts(Slack.SearchAllResponse.Posts posts) { }

    global void setProvided(String provided) { }

    global void setQuery(String query) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Posts {
        global Object Posts() { return null; }

        global Slack.SearchAllResponse.Posts clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getMatches() { return null; }

        global Integer getTotal() { return 0; }

        global virtual Integer hashCode() { return 0; }

        global void setMatches(List matches) { }

        global void setTotal(Integer total) { }

        global override virtual String toString() { return null; }
    }
}