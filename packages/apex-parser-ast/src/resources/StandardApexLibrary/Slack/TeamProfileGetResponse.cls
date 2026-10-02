global class TeamProfileGetResponse {
    global Object TeamProfileGetResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global String getNeeded() { return null; }

    global Slack.TeamProfileGetResponse.Profiles getProfile() { return null; }

    global String getProvided() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setProfile(Slack.TeamProfileGetResponse.Profiles profile) { }

    global void setProvided(String provided) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Profiles {
        global Object Profiles() { return null; }

        global Slack.TeamProfileGetResponse.Profiles clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getSections() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setSections(List sections) { }

        global override virtual String toString() { return null; }
    }

    global class Section {
        global Object Section() { return null; }

        global Slack.TeamProfileGetResponse.Section clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global String getLabel() { return null; }

        global Integer getOrder() { return 0; }

        global String getSectionType() { return null; }

        global String getTeamId() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isHidden() { return false; }

        global void setHidden(Boolean hidden) { }

        global void setId(String id) { }

        global void setLabel(String label) { }

        global void setOrder(Integer order) { }

        global void setSectionType(String sectionType) { }

        global void setTeamId(String teamId) { }

        global override virtual String toString() { return null; }
    }
}