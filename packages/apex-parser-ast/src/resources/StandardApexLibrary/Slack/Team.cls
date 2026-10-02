global class Team {
    global Object Team() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getAvatarBaseUrl() { return null; }

    global List getDefaultChannels() { return null; }

    global String getDiscoverable() { return null; }

    global String getDomain() { return null; }

    global String getEmailDomain() { return null; }

    global String getEnterpriseDomain() { return null; }

    global String getEnterpriseId() { return null; }

    global String getEnterpriseName() { return null; }

    global Slack.TeamIcon getIcon() { return null; }

    global String getId() { return null; }

    global Boolean getIsVerified() { return false; }

    global String getName() { return null; }

    global String getUrl() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setAvatarBaseUrl(String avatarBaseUrl) { }

    global void setDefaultChannels(List defaultChannels) { }

    global void setDiscoverable(String discoverable) { }

    global void setDomain(String domain) { }

    global void setEmailDomain(String emailDomain) { }

    global void setEnterpriseDomain(String enterpriseDomain) { }

    global void setEnterpriseId(String enterpriseId) { }

    global void setEnterpriseName(String enterpriseName) { }

    global void setIcon(Slack.TeamIcon icon) { }

    global void setId(String id) { }

    global void setIsVerified(Boolean isVerified) { }

    global void setName(String name) { }

    global void setUrl(String url) { }

    global override String toString() { return null; }

    global class Profile {
        global Object Profile() { return null; }

        global Slack.Team.Profile clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getFieldName() { return null; }

        global String getHint() { return null; }

        global String getId() { return null; }

        global String getLabel() { return null; }

        global Slack.Team.ProfileOptions getOptions() { return null; }

        global Integer getOrdering() { return 0; }

        global Slack.Team.ProfilePermissions getPermissions() { return null; }

        global List getPossibleValues() { return null; }

        global String getSectionId() { return null; }

        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isHidden() { return false; }

        global void setFieldName(String fieldName) { }

        global void setHidden(Boolean hidden) { }

        global void setHint(String hintValue) { }

        global void setId(String id) { }

        global void setLabel(String label) { }

        global void setOptions(Slack.Team.ProfileOptions options) { }

        global void setOrdering(Integer ordering) { }

        global void setPermissions(Slack.Team.ProfilePermissions permissions) { }

        global void setPossibleValues(List possibleValues) { }

        global void setSectionId(String sectionId) { }

        global void setType(String type) { }

        global override virtual String toString() { return null; }
    }

    global class ProfileOptions {
        global Object ProfileOptions() { return null; }

        global Slack.Team.ProfileOptions clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isScim() { return false; }

        global Boolean isprotected() { return false; }

        global void setScim(Boolean scim) { }

        global void setprotected(Boolean _protected) { }

        global override virtual String toString() { return null; }
    }

    global class ProfilePermissions {
        global Object ProfilePermissions() { return null; }

        global Slack.Team.ProfilePermissions clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getApi() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isScim() { return false; }

        global Boolean isUi() { return false; }

        global void setApi(List api) { }

        global void setScim(Boolean scim) { }

        global void setUi(Boolean ui) { }

        global override virtual String toString() { return null; }
    }
}