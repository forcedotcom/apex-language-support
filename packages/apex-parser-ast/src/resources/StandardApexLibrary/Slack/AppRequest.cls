global class AppRequest {

  global String getImage32() {}

  global String getImage36() {}

  global String getImage48() {}

  global String getImage64() {}

  global String getImage72() {}

  global String getImage96() {}

  global String getImage128() {}

  global String getImage192() {}

  global String getImage512() {}

  global String getImage1024() {}

  global String getImageOriginal() {}

  global void setImage32(String image32) {}

  global void setImage36(String image36) {}

  global void setImage48(String image48) {}

  global void setImage64(String image64) {}

  global void setImage72(String image72) {}

  global void setImage96(String image96) {}

  global void setImage128(String image128) {}

  global void setImage192(String image192) {}

  global void setImage512(String image512) {}

  global void setImage1024(String image1024) {}

  global void setImageOriginal(String imageOriginal) {}

  global Slack.RequestedApp getApp() {}

  global Integer getDateCreated() {}

  global String getId() {}

  global Boolean getIsUserAppCollaborator() {}

  global String getMessage() {}

  global Slack.AppRequest.PreviousResolution getPreviousResolution() {}

  global List<Slack.AppScope> getScopes() {}

  global Slack.AppRequest.Team getTeam() {}

  global Slack.AppRequest.User getUser() {}

  global void setApp(Slack.RequestedApp app) {}

  global void setDateCreated(Integer dateCreated) {}

  global void setId(String id) {}

  global void setIsUserAppCollaborator(Boolean isUserAppCollaborator) {}

  global void setMessage(String message) {}

  global void setPreviousResolution(Slack.AppRequest.PreviousResolution previousResolution) {}

  global void setScopes(List<Slack.AppScope> scopes) {}

  global void setTeam(Slack.AppRequest.Team team) {}

  global void setUser(Slack.AppRequest.User user) {}

  global String getStatus() {}

  global void setStatus(String status) {}

  global String getDomain() {}

  global String getName() {}

  global void setDomain(String domain) {}

  global void setName(String name) {}

  global String getEmail() {}

  global void setEmail(String email) {}

  global String getDescription() {}

  global String getTokenType() {}

  global Boolean isSensitive() {}

  global void setDescription(String description) {}

  global void setSensitive(Boolean sensitive) {}

  global void setTokenType(String tokenType) {}

  global String getAdditionalInfo() {}

  global String getAppDirectoryUrl() {}

  global String getAppHomepageUrl() {}

  global String getHelpUrl() {}

  global Slack.AppIcons getIcons() {}

  global String getPrivacyPolicyUrl() {}

  global Boolean isAppDirectoryApproved() {}

  global Boolean isInternal() {}

  global void setAdditionalInfo(String additionalInfo) {}

  global void setAppHomepageUrl(String appHomepageUrl) {}

  global void setHelpUrl(String helpUrl) {}

  global void setIcons(Slack.AppIcons icons) {}

  global void setInternal(Boolean internal) {}

  global void setPrivacyPolicyUrl(String privacyPolicyUrl) {}

}