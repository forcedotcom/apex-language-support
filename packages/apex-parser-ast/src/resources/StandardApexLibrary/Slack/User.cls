global class User {
    global Object User() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getColor() { return null; }

    global Slack.User.EnterpriseUser getEnterpriseUser() { return null; }

    global String getId() { return null; }

    global String getLocale() { return null; }

    global String getName() { return null; }

    global String getPresence() { return null; }

    global Slack.User.Profile getProfile() { return null; }

    global String getRealName() { return null; }

    global String getTeamId() { return null; }

    global String getTwoFactorType() { return null; }

    global String getTz() { return null; }

    global String getTzLabel() { return null; }

    global Integer getTzOffset() { return 0; }

    global Long getUpdated() { return 0L; }

    global String getWhoCanShareContactCard() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isAdmin() { return false; }

    global Boolean isAppUser() { return false; }

    global Boolean isBot() { return false; }

    global Boolean isDeleted() { return false; }

    global Boolean isEmailConfirmed() { return false; }

    global Boolean isHas2fa() { return false; }

    global Boolean isHasFiles() { return false; }

    global Boolean isInvitedUser() { return false; }

    global Boolean isOwner() { return false; }

    global Boolean isPrimaryOwner() { return false; }

    global Boolean isRestricted() { return false; }

    global Boolean isStranger() { return false; }

    global Boolean isUltraRestricted() { return false; }

    global Boolean isWorkflowBot() { return false; }

    global void setAdmin(Boolean admin) { }

    global void setAppUser(Boolean appUser) { }

    global void setBot(Boolean bot) { }

    global void setColor(String color) { }

    global void setDeleted(Boolean deleted) { }

    global void setEmailConfirmed(Boolean emailConfirmed) { }

    global void setEnterpriseUser(Slack.User.EnterpriseUser enterpriseUser) { }

    global void setHas2fa(Boolean has2fa) { }

    global void setHasFiles(Boolean hasFiles) { }

    global void setId(String id) { }

    global void setInvitedUser(Boolean invitedUser) { }

    global void setLocale(String locale) { }

    global void setName(String name) { }

    global void setOwner(Boolean owner) { }

    global void setPresence(String presence) { }

    global void setPrimaryOwner(Boolean primaryOwner) { }

    global void setProfile(Slack.User.Profile profile) { }

    global void setRealName(String realName) { }

    global void setRestricted(Boolean restricted) { }

    global void setStranger(Boolean stranger) { }

    global void setTeamId(String teamId) { }

    global void setTwoFactorType(String twoFactorType) { }

    global void setTz(String tz) { }

    global void setTzLabel(String tzLabel) { }

    global void setTzOffset(Integer tzOffset) { }

    global void setUltraRestricted(Boolean ultraRestricted) { }

    global void setUpdated(Long updated) { }

    global void setWhoCanShareContactCard(String whoCanShareContactCard) { }

    global void setWorkflowBot(Boolean workflowBot) { }

    global override String toString() { return null; }

    global class EnterpriseUser {
        global Object EnterpriseUser() { return null; }

        global Slack.User.EnterpriseUser clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getEnterpriseId() { return null; }

        global String getEnterpriseName() { return null; }

        global String getId() { return null; }

        global List getTeams() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isAdmin() { return false; }

        global Boolean isOwner() { return false; }

        global Boolean isPrimaryOwner() { return false; }

        global void setAdmin(Boolean admin) { }

        global void setEnterpriseId(String enterpriseId) { }

        global void setEnterpriseName(String enterpriseName) { }

        global void setId(String id) { }

        global void setOwner(Boolean owner) { }

        global void setPrimaryOwner(Boolean primaryOwner) { }

        global void setTeams(List teams) { }

        global override virtual String toString() { return null; }
    }

    global class Field {
        global Object Field() { return null; }

        global Slack.User.Field clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAlt() { return null; }

        global String getLabel() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setAlt(String alt) { }

        global void setLabel(String label) { }

        global void setValue(String value) { }

        global override virtual String toString() { return null; }
    }

    global class Profile {
        global Object Profile() { return null; }

        global Slack.User.Profile clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getApiAppId() { return null; }

        global String getAvatarHash() { return null; }

        global String getBotId() { return null; }

        global String getDisplayName() { return null; }

        global String getDisplayNameNormalized() { return null; }

        global String getEmail() { return null; }

        global Map getFields() { return null; }

        global String getGuestChannels() { return null; }

        global Long getGuestExpirationTs() { return 0L; }

        global String getGuestInvitedBy() { return null; }

        global String getHuddleState() { return null; }

        global Long getHuddleStateExpirationTs() { return 0L; }

        global String getImage1024() { return null; }

        global String getImage192() { return null; }

        global String getImage24() { return null; }

        global String getImage32() { return null; }

        global String getImage48() { return null; }

        global String getImage512() { return null; }

        global String getImage72() { return null; }

        global String getImageOriginal() { return null; }

        global String getPhone() { return null; }

        global String getPronouns() { return null; }

        global String getRealName() { return null; }

        global String getRealNameNormalized() { return null; }

        global String getSkype() { return null; }

        global String getStatusEmoji() { return null; }

        global List getStatusEmojiDisplayInfo() { return null; }

        global String getStatusEmojiUrl() { return null; }

        global Long getStatusExpiration() { return 0L; }

        global String getStatusText() { return null; }

        global String getStatusTextCanonical() { return null; }

        global String getTeam() { return null; }

        global String getTitle() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isAlwaysActive() { return false; }

        global Boolean isCustomImage() { return false; }

        global void setAlwaysActive(Boolean alwaysActive) { }

        global void setApiAppId(String apiAppId) { }

        global void setAvatarHash(String avatarHash) { }

        global void setBotId(String botId) { }

        global void setCustomImage(Boolean customImage) { }

        global void setDisplayName(String displayName) { }

        global void setDisplayNameNormalized(String displayNameNormalized) { }

        global void setEmail(String email) { }

        global void setFields(Map fields) { }

        global void setGuestChannels(String guestChannels) { }

        global void setGuestExpirationTs(Long guestExpirationTs) { }

        global void setGuestInvitedBy(String guestInvitedBy) { }

        global void setHuddleState(String huddleState) { }

        global void setHuddleStateExpirationTs(Long huddleStateExpirationTs) { }

        global void setImage1024(String image1024) { }

        global void setImage192(String image192) { }

        global void setImage24(String image24) { }

        global void setImage32(String image32) { }

        global void setImage48(String image48) { }

        global void setImage512(String image512) { }

        global void setImage72(String image72) { }

        global void setImageOriginal(String imageOriginal) { }

        global void setPhone(String phone) { }

        global void setPronouns(String pronouns) { }

        global void setRealName(String realName) { }

        global void setRealNameNormalized(String realNameNormalized) { }

        global void setSkype(String skype) { }

        global void setStatusEmoji(String statusEmoji) { }

        global void setStatusEmojiDisplayInfo(List statusEmojiDisplayInfo) { }

        global void setStatusEmojiUrl(String statusEmojiUrl) { }

        global void setStatusExpiration(Long statusExpiration) { }

        global void setStatusText(String statusText) { }

        global void setStatusTextCanonical(String statusTextCanonical) { }

        global void setTeam(String team) { }

        global void setTitle(String title) { }

        global override virtual String toString() { return null; }
    }

    global class StatusEmojiDisplayInfo {
        global Object StatusEmojiDisplayInfo() { return null; }

        global Slack.User.StatusEmojiDisplayInfo clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getDisplayAlias() { return null; }

        global String getDisplayUrl() { return null; }

        global String getEmojiName() { return null; }

        global String getUnicode() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setDisplayAlias(String displayAlias) { }

        global void setDisplayUrl(String displayUrl) { }

        global void setEmojiName(String emojiName) { }

        global void setUnicode(String unicode) { }

        global override virtual String toString() { return null; }
    }
}