global class Reaction {

  global Integer getCount() {}

  global String getName() {}

  global String getUrl() {}

  global List<String> getUsers() {}

  global void setCount(Integer count) {}

  global void setName(String name) {}

  global void setUrl(String url) {}

  global void setUsers(List<String> users) {}

  global static Slack.ReactionsAddRequest.Builder builder() {}

  global Slack.ReactionsAddRequest build() {}

  global Slack.ReactionsAddRequest.Builder channel(String channel) {}

  global Slack.ReactionsAddRequest.Builder file(String file) {}

  global Slack.ReactionsAddRequest.Builder fileComment(String fileComment) {}

  global Slack.ReactionsAddRequest.Builder name(String name) {}

  global Slack.ReactionsAddRequest.Builder timestamp(String timestamp) {}

  global static Slack.ReactionsGetRequest.Builder builder() {}

  global Slack.ReactionsGetRequest build() {}

  global Slack.ReactionsGetRequest.Builder channel(String channel) {}

  global Slack.ReactionsGetRequest.Builder file(String file) {}

  global Slack.ReactionsGetRequest.Builder fileComment(String fileComment) {}

  global Slack.ReactionsGetRequest.Builder full(Boolean full) {}

  global Slack.ReactionsGetRequest.Builder timestamp(String timestamp) {}

  global Slack.ReactionsGetResponse.Message getMessage() {}

  global String getType() {}

  global void setChannel(String channel) {}

  global void setMessage(Slack.ReactionsGetResponse.Message message) {}

  global void setType(String type) {}

  global String getBotId() {}

  global Slack.BotProfile getBotProfile() {}

  global String getPermalink() {}

  global List<Slack.Reaction> getReactions() {}

  global String getSubtype() {}

  global String getTeam() {}

  global String getText() {}

  global String getTs() {}

  global String getUser() {}

  global String getUsername() {}

  global void setBotId(String botId) {}

  global void setBotProfile(Slack.BotProfile botProfile) {}

  global void setPermalink(String permalink) {}

  global void setReactions(List<Slack.Reaction> reactions) {}

  global void setSubtype(String subtype) {}

  global void setTeam(String team) {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global void setUsername(String username) {}

  global static Slack.ReactionsListRequest.Builder builder() {}

  global Slack.ReactionsListRequest build() {}

  global Slack.ReactionsListRequest.Builder count(Integer count) {}

  global Slack.ReactionsListRequest.Builder full(Boolean full) {}

  global Slack.ReactionsListRequest.Builder limitValue(Integer limitValue) {}

  global Slack.ReactionsListRequest.Builder page(Integer page) {}

  global Slack.ReactionsListRequest.Builder teamId(String teamId) {}

  global Slack.ReactionsListRequest.Builder user(String user) {}

  global List<Slack.ReactionsListResponse.Item> getItems() {}

  global Slack.Paging getPaging() {}

  global void setItems(List<Slack.ReactionsListResponse.Item> items) {}

  global void setPaging(Slack.Paging paging) {}

  global String getImage36() {}

  global String getImage48() {}

  global String getImage64() {}

  global String getImage72() {}

  global void setImage36(String image36) {}

  global void setImage48(String image48) {}

  global void setImage64(String image64) {}

  global void setImage72(String image72) {}

  global String getChannel() {}

  global Slack.ReactionsListResponse.Message getMessage() {}

  global void setMessage(Slack.ReactionsListResponse.Message message) {}

  global String getClientMsgId() {}

  global List<Slack.File> getFiles() {}

  global Slack.ReactionsListResponse.Icons getIcons() {}

  global String getInviter() {}

  global String getLastRead() {}

  global String getLatestReply() {}

  global String getParentUserId() {}

  global Integer getReplyCount() {}

  global List<String> getReplyUsers() {}

  global Integer getReplyUsersCount() {}

  global String getSourceTeam() {}

  global String getThreadTs() {}

  global Slack.ReactionsListResponse.UserProfile getUserProfile() {}

  global String getUserTeam() {}

  global Boolean isDisplayAsBot() {}

  global Boolean isLocked() {}

  global Boolean isSubscribed() {}

  global Boolean isUpload() {}

  global void setClientMsgId(String clientMsgId) {}

  global void setDisplayAsBot(Boolean displayAsBot) {}

  global void setFiles(List<Slack.File> files) {}

  global void setIcons(Slack.ReactionsListResponse.Icons icons) {}

  global void setInviter(String inviter) {}

  global void setLastRead(String lastRead) {}

  global void setLatestReply(String latestReply) {}

  global void setLocked(Boolean locked) {}

  global void setParentUserId(String parentUserId) {}

  global void setReplyCount(Integer replyCount) {}

  global void setReplyUsers(List<String> replyUsers) {}

  global void setReplyUsersCount(Integer replyUsersCount) {}

  global void setSourceTeam(String sourceTeam) {}

  global void setSubscribed(Boolean subscribed) {}

  global void setText(String text) {}

  global void setThreadTs(String threadTs) {}

  global void setUpload(Boolean upload) {}

  global void setUserProfile(Slack.ReactionsListResponse.UserProfile userProfile) {}

  global void setUserTeam(String userTeam) {}

  global String getAvatarHash() {}

  global String getDisplayName() {}

  global String getFirstName() {}

  global String getRealName() {}

  global Boolean isRestricted() {}

  global Boolean isUltraRestricted() {}

  global void setAvatarHash(String avatarHash) {}

  global void setDisplayName(String displayName) {}

  global void setFirstName(String firstName) {}

  global void setRealName(String realName) {}

  global void setRestricted(Boolean restricted) {}

  global void setUltraRestricted(Boolean ultraRestricted) {}

  global static Slack.ReactionsRemoveRequest.Builder builder() {}

  global Slack.ReactionsRemoveRequest build() {}

  global Slack.ReactionsRemoveRequest.Builder channel(String channel) {}

  global Slack.ReactionsRemoveRequest.Builder file(String file) {}

  global Slack.ReactionsRemoveRequest.Builder fileComment(String fileComment) {}

  global Slack.ReactionsRemoveRequest.Builder full(Boolean full) {}

  global Slack.ReactionsRemoveRequest.Builder timestamp(String timestamp) {}

}