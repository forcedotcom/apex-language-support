global class User {

  global String getColor() {}

  global Slack.User.EnterpriseUser getEnterpriseUser() {}

  global String getId() {}

  global String getLocale() {}

  global String getName() {}

  global String getPresence() {}

  global Slack.User.Profile getProfile() {}

  global String getRealName() {}

  global String getTeamId() {}

  global String getTwoFactorType() {}

  global String getTz() {}

  global String getTzLabel() {}

  global Integer getTzOffset() {}

  global Long getUpdated() {}

  global Boolean isAdmin() {}

  global Boolean isAppUser() {}

  global Boolean isBot() {}

  global Boolean isDeleted() {}

  global Boolean isEmailConfirmed() {}

  global Boolean isHas2fa() {}

  global Boolean isHasFiles() {}

  global Boolean isInvitedUser() {}

  global Boolean isOwner() {}

  global Boolean isPrimaryOwner() {}

  global Boolean isRestricted() {}

  global Boolean isStranger() {}

  global Boolean isUltraRestricted() {}

  global Boolean isWorkflowBot() {}

  global Boolean isWhoCanShareContactCard() {}

  global void setAdmin(Boolean admin) {}

  global void setAppUser(Boolean appUser) {}

  global void setBot(Boolean bot) {}

  global void setColor(String color) {}

  global void setDeleted(Boolean deleted) {}

  global void setEmailConfirmed(Boolean emailConfirmed) {}

  global void setEnterpriseUser(Slack.User.EnterpriseUser enterpriseUser) {}

  global void setHas2fa(Boolean has2fa) {}

  global void setHasFiles(Boolean hasFiles) {}

  global void setId(String id) {}

  global void setInvitedUser(Boolean invitedUser) {}

  global void setLocale(String locale) {}

  global void setName(String name) {}

  global void setOwner(Boolean owner) {}

  global void setPresence(String presence) {}

  global void setPrimaryOwner(Boolean primaryOwner) {}

  global void setProfile(Slack.User.Profile profile) {}

  global void setRealName(String realName) {}

  global void setRestricted(Boolean restricted) {}

  global void setStranger(Boolean stranger) {}

  global void setTeamId(String teamId) {}

  global void setTwoFactorType(String twoFactorType) {}

  global void setTz(String tz) {}

  global void setTzLabel(String tzLabel) {}

  global void setTzOffset(Integer tzOffset) {}

  global void setUltraRestricted(Boolean ultraRestricted) {}

  global void setUpdated(Long updated) {}

  global void setWhoCanShareContactCard(Boolean whoCanShareContactCard) {}

  global void setWorkflowBot(Boolean workflowBot) {}

  global String getEnterpriseId() {}

  global String getEnterpriseName() {}

  global List<String> getTeams() {}

  global void setAdmin(Boolean isAdmin) {}

  global void setEnterpriseId(String enterpriseId) {}

  global void setEnterpriseName(String enterpriseName) {}

  global void setOwner(Boolean isOwner) {}

  global void setTeams(List<String> teams) {}

  global String getAlt() {}

  global String getLabel() {}

  global String getValue() {}

  global void setAlt(String alt) {}

  global void setLabel(String label) {}

  global void setValue(String value) {}

  global String getApiAppId() {}

  global String getAvatarHash() {}

  global String getBotId() {}

  global String getDisplayName() {}

  global String getDisplayNameNormalized() {}

  global String getEmail() {}

  global Map<String,Slack.User.Field> getFields() {}

  global String getGuestChannels() {}

  global Long getGuestExpirationTs() {}

  global String getGuestInvitedBy() {}

  global String getImage24() {}

  global String getImage32() {}

  global String getImage48() {}

  global String getImage72() {}

  global String getImage192() {}

  global String getImage512() {}

  global String getImage1024() {}

  global String getImageOriginal() {}

  global String getPhone() {}

  global String getPronouns() {}

  global String getRealNameNormalized() {}

  global String getSkype() {}

  global String getStatusEmoji() {}

  global List<Slack.User.StatusEmojiDisplayInfo> getStatusEmojiDisplayInfo() {}

  global String getStatusEmojiUrl() {}

  global Long getStatusExpiration() {}

  global String getStatusText() {}

  global String getStatusTextCanonical() {}

  global String getTeam() {}

  global String getTitle() {}

  global Boolean isAlwaysActive() {}

  global Boolean isCustomImage() {}

  global void setAlwaysActive(Boolean alwaysActive) {}

  global void setApiAppId(String apiAppId) {}

  global void setAvatarHash(String avatarHash) {}

  global void setBotId(String botId) {}

  global void setCustomImage(Boolean customImage) {}

  global void setDisplayName(String displayName) {}

  global void setDisplayNameNormalized(String displayNameNormalized) {}

  global void setEmail(String email) {}

  global void setFields(Slack.User.Field> fields) {}

  global void setGuestChannels(String guestChannels) {}

  global void setGuestExpirationTs(Long guestExpirationTs) {}

  global void setGuestInvitedBy(String guestInvitedBy) {}

  global void setImage24(String image24) {}

  global void setImage32(String image32) {}

  global void setImage48(String image48) {}

  global void setImage72(String image72) {}

  global void setImage192(String image192) {}

  global void setImage512(String image512) {}

  global void setImage1024(String image1024) {}

  global void setImageOriginal(String imageOriginal) {}

  global void setPhone(String phone) {}

  global void setPronouns(String pronouns) {}

  global void setRealNameNormalized(String realNameNormalized) {}

  global void setSkype(String skype) {}

  global void setStatusEmoji(String statusEmoji) {}

  global void setStatusEmojiUrl(String statusEmojiUrl) {}

  global void setStatusExpiration(Long statusExpiration) {}

  global void setStatusText(String statusText) {}

  global void setStatusTextCanonical(String statusTextCanonical) {}

  global void setTeam(String team) {}

  global void setTitle(String title) {}

  global String getEmojiName() {}

  global String getDisplayAlias() {}

  global String getDisplayUrl() {}

  global void setEmojiName(String emojiName) {}

  global void setDisplayAlias(String displayAlias) {}

  global void setDisplayUrl(String displayUrl) {}

  global static Slack.UsersConversationsRequest.Builder builder() {}

  global Slack.UsersConversationsRequest build() {}

  global Slack.UsersConversationsRequest.Builder cursor(String cursor) {}

  global Slack.UsersConversationsRequest.Builder excludeArchived(Boolean excludeArchived) {}

  global Slack.UsersConversationsRequest.Builder limitValue(Integer limitValue) {}

  global Slack.UsersConversationsRequest.Builder teamId(String teamId) {}

  global Slack.UsersConversationsRequest.Builder types(List<Slack.ConversationType> types) {}

  global Slack.UsersConversationsRequest.Builder user(String user) {}

  global List<Slack.Conversation> getChannels() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setChannels(List<Slack.Conversation> channels) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global Slack.UsersDeletePhotoRequest build() {}

  global static Slack.UsersDeletePhotoRequest.Builder builder() {}

  global Slack.UsersGetPresenceRequest build() {}

  global Slack.UsersGetPresenceRequest.Builder user(String user) {}

  global static Slack.UsersGetPresenceRequest.Builder builder() {}

  global Integer getConnectionCount() {}

  global Integer getLastActivity() {}

  global Boolean isAutoAway() {}

  global Boolean isManualAway() {}

  global Boolean isOnline() {}

  global void setAutoAway(Boolean autoAway) {}

  global void setConnectionCount(Integer connectionCount) {}

  global void setLastActivity(Integer lastActivity) {}

  global void setManualAway(Boolean manualAway) {}

  global void setOnline(Boolean online) {}

  global Slack.UsersIdentityRequest build() {}

  global static Slack.UsersIdentityRequest.Builder builder() {}

  global Slack.UsersIdentityResponse.Team getTeam() {}

  global Slack.UsersIdentityResponse.User getUser() {}

  global void setTeam(Slack.UsersIdentityResponse.Team team) {}

  global void setUser(Slack.UsersIdentityResponse.User user) {}

  global static Slack.UsersInfoRequest.Builder builder() {}

  global Slack.UsersInfoRequest build() {}

  global Slack.UsersInfoRequest.Builder includeLocale(Boolean includeLocale) {}

  global Slack.UsersInfoRequest.Builder user(String user) {}

  global Slack.User getUser() {}

  global void setUser(Slack.User user) {}

  global static Slack.UsersListRequest.Builder builder() {}

  global Slack.UsersListRequest build() {}

  global Slack.UsersListRequest.Builder cursor(String cursor) {}

  global Slack.UsersListRequest.Builder includeLocale(Boolean includeLocale) {}

  global Slack.UsersListRequest.Builder limitValue(Integer limitValue) {}

  global Slack.UsersListRequest.Builder teamId(String teamId) {}

  global String getCacheTs() {}

  global List<Slack.User> getMembers() {}

  global String getOffset() {}

  global void setCacheTs(String cacheTs) {}

  global void setMembers(List<Slack.User> members) {}

  global void setOffset(String offset) {}

  global static Slack.UsersLookupByEmailRequest.Builder builder() {}

  global Slack.UsersLookupByEmailRequest build() {}

  global Slack.UsersLookupByEmailRequest.Builder email(String email) {}

  global static Slack.UsersProfileGetRequest.Builder builder() {}

  global Slack.UsersProfileGetRequest build() {}

  global Slack.UsersProfileGetRequest.Builder includeLabels(Boolean includeLabels) {}

  global Slack.UsersProfileGetRequest.Builder user(String user) {}

  global static Slack.UsersProfileSetRequest.Builder builder() {}

  global Slack.UsersProfileSetRequest build() {}

  global Slack.UsersProfileSetRequest.Builder name(String name) {}

  global Slack.UsersProfileSetRequest.Builder user(String user) {}

  global Slack.UsersProfileSetRequest.Builder value(String value) {}

  global String getUsername() {}

  global static Slack.UsersSetActiveRequest.Builder builder() {}

  global Slack.UsersSetActiveRequest build() {}

  global static Slack.UsersSetPresenceRequest.Builder builder() {}

  global Slack.UsersSetPresenceRequest build() {}

  global Slack.UsersSetPresenceRequest.Builder presence(String presence) {}

}