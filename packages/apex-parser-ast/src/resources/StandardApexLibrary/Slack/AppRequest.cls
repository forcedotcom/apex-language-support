global class AppRequest {
    global Object AppRequest() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.RequestedApp getApp() { return null; }

    global Integer getDateCreated() { return 0; }

    global String getId() { return null; }

    global Boolean getIsUserAppCollaborator() { return false; }

    global String getMessage() { return null; }

    global Slack.AppRequest.PreviousResolution getPreviousResolution() { return null; }

    global List getScopes() { return null; }

    global Slack.AppRequest.Team getTeam() { return null; }

    global Slack.AppRequest.User getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setApp(Slack.RequestedApp app) { }

    global void setDateCreated(Integer dateCreated) { }

    global void setId(String id) { }

    global void setIsUserAppCollaborator(Boolean isUserAppCollaborator) { }

    global void setMessage(String message) { }

    global void setPreviousResolution(Slack.AppRequest.PreviousResolution previousResolution) { }

    global void setScopes(List scopes) { }

    global void setTeam(Slack.AppRequest.Team team) { }

    global void setUser(Slack.AppRequest.User user) { }

    global override String toString() { return null; }

    global class PreviousResolution {
        global Object PreviousResolution() { return null; }

        global Slack.AppRequest.PreviousResolution clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getScopes() { return null; }

        global String getStatus() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setScopes(List scopes) { }

        global void setStatus(String status) { }

        global override virtual String toString() { return null; }
    }

    global class Team {
        global Object Team() { return null; }

        global Slack.AppRequest.Team clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getDomain() { return null; }

        global String getId() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setDomain(String domain) { }

        global void setId(String id) { }

        global void setName(String name) { }

        global override virtual String toString() { return null; }
    }

    global class User {
        global Object User() { return null; }

        global Slack.AppRequest.User clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getEmail() { return null; }

        global String getId() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setEmail(String email) { }

        global void setId(String id) { }

        global void setName(String name) { }

        global override virtual String toString() { return null; }
    }
}