global class RequestedApp {
    global Object RequestedApp() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getAdditionalInfo() { return null; }

    global String getAppDirectoryUrl() { return null; }

    global String getAppHomepageUrl() { return null; }

    global String getDescription() { return null; }

    global String getHelpUrl() { return null; }

    global Slack.AppIcons getIcons() { return null; }

    global String getId() { return null; }

    global String getName() { return null; }

    global String getPrivacyPolicyUrl() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isAppDirectoryApproved() { return false; }

    global Boolean isInternal() { return false; }

    global void setAdditionalInfo(String additionalInfo) { }

    global void setAppDirectoryApproved(Boolean appDirectoryApproved) { }

    global void setAppDirectoryUrl(String appDirectoryUrl) { }

    global void setAppHomepageUrl(String appHomepageUrl) { }

    global void setDescription(String description) { }

    global void setHelpUrl(String helpUrl) { }

    global void setIcons(Slack.AppIcons icons) { }

    global void setId(String id) { }

    global void setInternal(Boolean internal) { }

    global void setName(String name) { }

    global void setPrivacyPolicyUrl(String privacyPolicyUrl) { }

    global override String toString() { return null; }
}