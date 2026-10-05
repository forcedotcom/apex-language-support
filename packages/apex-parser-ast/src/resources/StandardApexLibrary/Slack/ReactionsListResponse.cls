global class ReactionsListResponse {
    global ReactionsListResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global List getItems() { return null; }

    global String getNeeded() { return null; }

    global Slack.Paging getPaging() { return null; }

    global String getProvided() { return null; }

    global Slack.ResponseMetadata getResponseMetadata() { return null; }

    global String getWarning() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isOk() { return false; }

    global void setError(String error) { }

    global void setHttpResponseHeaders(Map httpResponseHeaders) { }

    global void setItems(List items) { }

    global void setNeeded(String needed) { }

    global void setOk(Boolean ok) { }

    global void setPaging(Slack.Paging paging) { }

    global void setProvided(String provided) { }

    global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) { }

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Icons {
        global Icons() { }

        global Slack.ReactionsListResponse.Icons clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getImage36() { return null; }

        global String getImage48() { return null; }

        global String getImage64() { return null; }

        global String getImage72() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setImage36(String image36) { }

        global void setImage48(String image48) { }

        global void setImage64(String image64) { }

        global void setImage72(String image72) { }

        global override virtual String toString() { return null; }
    }

    global class Item {
        global Item() { }

        global Slack.ReactionsListResponse.Item clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getChannel() { return null; }

        global Slack.ReactionsListResponse.Message getMessage() { return null; }

        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannel(String channel) { }

        global void setMessage(Slack.ReactionsListResponse.Message message) { }

        global void setType(String type) { }

        global override virtual String toString() { return null; }
    }

    global class Message {
        global Message() { }

        global Slack.ReactionsListResponse.Message clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAppId() { return null; }

        global String getBotId() { return null; }

        global Slack.BotProfile getBotProfile() { return null; }

        global String getClientMsgId() { return null; }

        global List getFiles() { return null; }

        global Slack.ReactionsListResponse.Icons getIcons() { return null; }

        global String getInviter() { return null; }

        global String getLastRead() { return null; }

        global String getLatestReply() { return null; }

        global String getParentUserId() { return null; }

        global String getPermalink() { return null; }

        global List getReactions() { return null; }

        global Integer getReplyCount() { return 0; }

        global List getReplyUsers() { return null; }

        global Integer getReplyUsersCount() { return 0; }

        global String getSourceTeam() { return null; }

        global String getSubtype() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getThreadTs() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global String getUser() { return null; }

        global Slack.ReactionsListResponse.UserProfile getUserProfile() { return null; }

        global String getUserTeam() { return null; }

        global String getUsername() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isDisplayAsBot() { return false; }

        global Boolean isLocked() { return false; }

        global Boolean isSubscribed() { return false; }

        global Boolean isUpload() { return false; }

        global void setAppId(String appId) { }

        global void setBotId(String botId) { }

        global void setBotProfile(Slack.BotProfile botProfile) { }

        global void setClientMsgId(String clientMsgId) { }

        global void setDisplayAsBot(Boolean displayAsBot) { }

        global void setFiles(List files) { }

        global void setIcons(Slack.ReactionsListResponse.Icons icons) { }

        global void setInviter(String inviter) { }

        global void setLastRead(String lastRead) { }

        global void setLatestReply(String latestReply) { }

        global void setLocked(Boolean locked) { }

        global void setParentUserId(String parentUserId) { }

        global void setPermalink(String permalink) { }

        global void setReactions(List reactions) { }

        global void setReplyCount(Integer replyCount) { }

        global void setReplyUsers(List replyUsers) { }

        global void setReplyUsersCount(Integer replyUsersCount) { }

        global void setSourceTeam(String sourceTeam) { }

        global void setSubscribed(Boolean subscribed) { }

        global void setSubtype(String subtype) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setThreadTs(String threadTs) { }

        global void setTs(String ts) { }

        global void setType(String type) { }

        global void setUpload(Boolean upload) { }

        global void setUser(String user) { }

        global void setUserProfile(Slack.ReactionsListResponse.UserProfile userProfile) { }

        global void setUserTeam(String userTeam) { }

        global void setUsername(String username) { }

        global override virtual String toString() { return null; }
    }

    global class MessageRootReply {
        global MessageRootReply() { }

        global Slack.ReactionsListResponse.MessageRootReply clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }

    global class UserProfile {
        global UserProfile() { }

        global Slack.ReactionsListResponse.UserProfile clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAvatarHash() { return null; }

        global String getDisplayName() { return null; }

        global String getFirstName() { return null; }

        global String getImage72() { return null; }

        global String getName() { return null; }

        global String getRealName() { return null; }

        global String getTeam() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isRestricted() { return false; }

        global Boolean isUltraRestricted() { return false; }

        global void setAvatarHash(String avatarHash) { }

        global void setDisplayName(String displayName) { }

        global void setFirstName(String firstName) { }

        global void setImage72(String image72) { }

        global void setName(String name) { }

        global void setRealName(String realName) { }

        global void setRestricted(Boolean restricted) { }

        global void setTeam(String team) { }

        global void setUltraRestricted(Boolean ultraRestricted) { }

        global override virtual String toString() { return null; }
    }
}