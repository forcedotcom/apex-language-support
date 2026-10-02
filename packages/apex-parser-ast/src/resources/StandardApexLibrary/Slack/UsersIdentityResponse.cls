global class UsersIdentityResponse {
    global Object UsersIdentityResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global String getProvided() { return null; }

    global Slack.UsersIdentityResponse.Team getTeam() { return null; }

    global Slack.UsersIdentityResponse.User getUser() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProvided(String provided) { }

    global void setTeam(Slack.UsersIdentityResponse.Team team) { }

    global void setUser(Slack.UsersIdentityResponse.User user) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Team {
        global Object Team() { return null; }

        global Slack.UsersIdentityResponse.Team clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setId(String id) { }

        global void setName(String name) { }

        global override virtual String toString() { return null; }
    }

    global class User {
        global Object User() { return null; }

        global Slack.UsersIdentityResponse.User clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getEmail() { return null; }

        global String getId() { return null; }

        global String getImage192() { return null; }

        global String getImage24() { return null; }

        global String getImage32() { return null; }

        global String getImage48() { return null; }

        global String getImage512() { return null; }

        global String getImage72() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setEmail(String email) { }

        global void setId(String id) { }

        global void setImage192(String image192) { }

        global void setImage24(String image24) { }

        global void setImage32(String image32) { }

        global void setImage48(String image48) { }

        global void setImage512(String image512) { }

        global void setImage72(String image72) { }

        global void setName(String name) { }

        global override virtual String toString() { return null; }
    }
}