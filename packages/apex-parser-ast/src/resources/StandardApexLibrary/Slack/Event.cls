global class Event {

  global String getSubtype() {}

  global String getType() {}

  global override Slack.ActionHandler invoke(Slack.EventParameters parameters, Slack.RequestContext context) {}

  global Object getEvent() {}

  global String getEventId() {}

  global Integer getEventTime() {}

  global String getChannel() {}

  global String getEventTs() {}

  global String getSubtype() {}

  global String getTab() {}

  global String getType() {}

  global String getUser() {}

  global void setChannel(String channel) {}

  global void setEventTs(String eventTs) {}

  global void setTab(String tab) {}

  global void setUser(String user) {}

  global String getTs() {}

  global String getUser() {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getEventTs() {}

  global String getName() {}

  global List<String> getNames() {}

  global String getNewName() {}

  global String getOldName() {}

  global String getSubtype() {}

  global String getType() {}

  global String getValue() {}

  global void setEventTs(String eventTs) {}

  global void setName(String name) {}

  global void setNames(List<String> names) {}

  global void setNewName(String newName) {}

  global void setOldName(String oldName) {}

  global void setSubtype(String subtype) {}

  global void setValue(String value) {}

  global Slack.FileChangeEvent.File getFile() {}

  global String getFileId() {}

  global String getSubtype() {}

  global String getType() {}

  global void setFile(Slack.FileChangeEvent.File file) {}

  global void setFileId(String fileId) {}

  global String getEventTs() {}

  global Slack.FileCreatedEvent.File getFile() {}

  global String getFileId() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUserId() {}

  global void setFile(Slack.FileCreatedEvent.File file) {}

  global void setFileId(String fileId) {}

  global void setUserId(String userId) {}

  global List<String> getChannelIds() {}

  global String getEventTs() {}

  global String getFileId() {}

  global String getSubtype() {}

  global String getType() {}

  global void setChannelIds(List<String> channelIds) {}

  global void setEventTs(String eventTs) {}

  global void setFileId(String fileId) {}

  global String getEventTs() {}

  global Slack.FilePublicEvent.File getFile() {}

  global String getFileId() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUserId() {}

  global void setEventTs(String eventTs) {}

  global void setFile(Slack.FilePublicEvent.File file) {}

  global void setFileId(String fileId) {}

  global void setUserId(String userId) {}

  global String getChannelId() {}

  global String getEventTs() {}

  global Slack.FileSharedEvent.File getFile() {}

  global String getFileId() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUserId() {}

  global void setChannelId(String channelId) {}

  global void setEventTs(String eventTs) {}

  global void setFile(Slack.FileSharedEvent.File file) {}

  global void setFileId(String fileId) {}

  global void setUserId(String userId) {}

  global String getChannelId() {}

  global String getEventTs() {}

  global Slack.FileUnsharedEvent.File getFile() {}

  global String getFileId() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUserId() {}

  global void setChannelId(String channelId) {}

  global void setEventTs(String eventTs) {}

  global void setFile(Slack.FileUnsharedEvent.File file) {}

  global void setFileId(String fileId) {}

  global void setUserId(String userId) {}

  global String getBotId() {}

  global String getChannel() {}

  global String getChannelType() {}

  global String getEventTs() {}

  global String getSubtype() {}

  global String getText() {}

  global String getThreadTs() {}

  global String getTs() {}

  global String getType() {}

  global String getUsername() {}

  global void setBotId(String botId) {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setEventTs(String eventTs) {}

  global void setText(String text) {}

  global void setThreadTs(String threadTs) {}

  global void setTs(String ts) {}

  global void setUsername(String username) {}

  global String getChannel() {}

  global String getChannelType() {}

  global String getEventTs() {}

  global Slack.MessageChangedEvent.Message getMessage() {}

  global Slack.MessageChangedEvent.PreviousMessage getPreviousMessage() {}

  global String getSubtype() {}

  global String getTs() {}

  global String getType() {}

  global Boolean isHidden() {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setEventTs(String eventTs) {}

  global void setHidden(Boolean hidden) {}

  global void setMessage(Slack.MessageChangedEvent.Message message) {}

  global void setPreviousMessage(Slack.MessageChangedEvent.PreviousMessage previousMessage) {}

  global void setTs(String ts) {}

  global String getTs() {}

  global String getUser() {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getBotId() {}

  global Slack.BotProfile getBotProfile() {}

  global String getClientMsgId() {}

  global Boolean getDisplayAsBot() {}

  global List<Slack.File> getFiles() {}

  global Boolean getHidden() {}

  global Boolean getIsLocked() {}

  global String getLastRead() {}

  global String getLatestReply() {}

  global String getParentUserId() {}

  global List<String> getPinnedTo() {}

  global List<Slack.Reaction> getReactions() {}

  global Integer getReplyCount() {}

  global List<String> getReplyUsers() {}

  global Integer getReplyUsersCount() {}

  global String getSourceTeam() {}

  global Boolean getSubscribed() {}

  global String getSubtype() {}

  global String getTeam() {}

  global String getText() {}

  global String getThreadTs() {}

  global String getTs() {}

  global String getType() {}

  global Boolean getUpload() {}

  global String getUser() {}

  global String getUserTeam() {}

  global List<String> getXFiles() {}

  global Boolean isStarred() {}

  global void setBotId(String botId) {}

  global void setBotProfile(Slack.BotProfile botProfile) {}

  global void setClientMsgId(String clientMsgId) {}

  global void setDisplayAsBot(Boolean displayAsBot) {}

  global void setFiles(List<Slack.File> files) {}

  global void setHidden(Boolean hidden) {}

  global void setIsLocked(Boolean isLocked) {}

  global void setLastRead(String lastRead) {}

  global void setLatestReply(String latestReply) {}

  global void setParentUserId(String parentUserId) {}

  global void setPinnedTo(List<String> pinnedTo) {}

  global void setReactions(List<Slack.Reaction> reactions) {}

  global void setReplyCount(Integer replyCount) {}

  global void setReplyUsers(List<String> replyUsers) {}

  global void setReplyUsersCount(Integer replyUsersCount) {}

  global void setSourceTeam(String sourceTeam) {}

  global void setStarred(Boolean starred) {}

  global void setSubscribed(Boolean subscribed) {}

  global void setSubtype(String subtype) {}

  global void setTeam(String team) {}

  global void setText(String text) {}

  global void setThreadTs(String threadTs) {}

  global void setTs(String ts) {}

  global void setUpload(Boolean upload) {}

  global void setUser(String user) {}

  global void setUserTeam(String userTeam) {}

  global void setXFiles(List<String> xFiles) {}

  global Slack.MessageChangedEvent.Message getMessage() {}

  global void setMessage(Slack.MessageChangedEvent.Message message) {}

  global String getChannel() {}

  global String getChannelType() {}

  global String getDeletedTs() {}

  global String getEventTs() {}

  global Slack.MessageDeletedEvent.Message getPreviousMessage() {}

  global String getSubtype() {}

  global String getTs() {}

  global String getType() {}

  global Boolean isHidden() {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setDeletedTs(String deletedTs) {}

  global void setEventTs(String eventTs) {}

  global void setHidden(Boolean hidden) {}

  global void setPreviousMessage(Slack.MessageDeletedEvent.Message previousMessage) {}

  global void setTs(String ts) {}

  global String getTs() {}

  global String getUser() {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global String getChannelType() {}

  global String getEventTs() {}

  global String getSubtype() {}

  global String getText() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global Boolean isHidden() {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setEventTs(String eventTs) {}

  global void setHidden(Boolean hidden) {}

  global void setText(String text) {}

  global void setTs(String ts) {}

  global void setTs(String user) {}

  global String getBotId() {}

  global Slack.BotProfile getBotProfile() {}

  global String getChannel() {}

  global String getChannelType() {}

  global String getClientMsgId() {}

  global Slack.MessageEvent.Edited getEdited() {}

  global String getEventTs() {}

  global List<Slack.File> getFiles() {}

  global String getParentUserId() {}

  global String getSubtype() {}

  global String getTeam() {}

  global String getText() {}

  global String getThreadTs() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global void setBotId(String botId) {}

  global void setBotProfile(Slack.BotProfile botProfile) {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setClientMsgId(String clientMsgId) {}

  global void setEdited(Slack.MessageEvent.Edited edited) {}

  global void setEventTs(String eventTs) {}

  global void setFiles(List<Slack.File> files) {}

  global void setParentUserId(String parentUserId) {}

  global void setTeam(String team) {}

  global void setText(String text) {}

  global void setThreadTs(String threadTs) {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getTs() {}

  global String getUser() {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global String getChannelType() {}

  global Boolean getDisplayAsBot() {}

  global String getEventTs() {}

  global List<Slack.File> getFiles() {}

  global String getParentUserId() {}

  global String getSubtype() {}

  global String getText() {}

  global String getThreadTs() {}

  global String getTs() {}

  global String getType() {}

  global Boolean getUpload() {}

  global String getUser() {}

  global List<String> getXFiles() {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setDisplayAsBot(Boolean displayAsBot) {}

  global void setEventTs(String eventTs) {}

  global void setFiles(List<Slack.File> files) {}

  global void setParentUserId(String parentUserId) {}

  global void setText(String text) {}

  global void setThreadTs(String threadTs) {}

  global void setTs(String ts) {}

  global void setUpload(Boolean upload) {}

  global void setUser(String user) {}

  global void setXFiles(List<String> xFiles) {}

  global String getChannel() {}

  global String getChannelType() {}

  global String getEventTs() {}

  global String getSubtype() {}

  global String getText() {}

  global String getTopic() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setEventTs(String eventTs) {}

  global void setText(String text) {}

  global void setTopic(String topic) {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getBotId() {}

  global String getChannel() {}

  global String getChannelType() {}

  global String getEventTs() {}

  global String getSubtype() {}

  global String getText() {}

  global String getTs() {}

  global String getType() {}

  global String getUsername() {}

  global void setBotId(String botId) {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setEventTs(String eventTs) {}

  global void setText(String text) {}

  global void setTs(String ts) {}

  global void setUsername(String username) {}

  global String getChannel() {}

  global String getEventTs() {}

  global Slack.MessageRepliedEvent.Message getMessage() {}

  global String getSubtype() {}

  global String getTs() {}

  global String getType() {}

  global Boolean isHidden() {}

  global void setChannel(String channel) {}

  global void setEventTs(String eventTs) {}

  global void setHidden(Boolean hidden) {}

  global void setMessage(Slack.MessageRepliedEvent.Message message) {}

  global void setTs(String ts) {}

  global String getTs() {}

  global String getUser() {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getClientMsgId() {}

  global List<String> getPinnedTo() {}

  global List<Slack.Reaction> getReactions() {}

  global String getSourceTeam() {}

  global String getSubtype() {}

  global String getTeam() {}

  global String getText() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global String getUserTeam() {}

  global Boolean isStarred() {}

  global void setClientMsgId(String clientMsgId) {}

  global void setPinnedTo(List<String> pinnedTo) {}

  global void setReactions(List<Slack.Reaction> reactions) {}

  global void setSourceTeam(String sourceTeam) {}

  global void setStarred(Boolean starred) {}

  global void setSubtype(String subtype) {}

  global void setTeam(String team) {}

  global void setText(String text) {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global void setUserTeam(String userTeam) {}

  global String getChannel() {}

  global String getChannelType() {}

  global String getClientMsgId() {}

  global String getEventTs() {}

  global String getSubtype() {}

  global String getText() {}

  global String getThreadTs() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global void setChannel(String channel) {}

  global void setChannelType(String channelType) {}

  global void setClientMsgId(String clientMsgId) {}

  global void setEventTs(String eventTs) {}

  global void setText(String text) {}

  global void setThreadTs(String threadTs) {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getChannelId() {}

  global String getEventTs() {}

  global Slack.PinAddedEvent.Item getItem() {}

  global String getItemUser() {}

  global Integer getPinCount() {}

  global Slack.PinAddedEvent.PinnedInfo getPinnedInfo() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUser() {}

  global void setChannelId(String channelId) {}

  global void setEventTs(String eventTs) {}

  global void setItem(Slack.PinAddedEvent.Item item) {}

  global void setItemUser(String itemUser) {}

  global void setPinCount(Integer pinCount) {}

  global void setPinnedInfo(Slack.PinAddedEvent.PinnedInfo pinnedInfo) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global Slack.FileComment getComment() {}

  global Integer getCreated() {}

  global String getCreatedBy() {}

  global Slack.File getFile() {}

  global Slack.PinAddedEvent.Message getMessage() {}

  global String getType() {}

  global void setChannel(String channel) {}

  global void setComment(Slack.FileComment comment) {}

  global void setCreated(Integer created) {}

  global void setCreatedBy(String createdBy) {}

  global void setFile(Slack.File file) {}

  global void setMessage(Slack.PinAddedEvent.Message message) {}

  global void setType(String type) {}

  global String getAppId() {}

  global String getBotId() {}

  global Slack.BotProfile getBotProfile() {}

  global String getClientMsgId() {}

  global String getPermalink() {}

  global List<String> getPinnedTo() {}

  global String getTeam() {}

  global String getText() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global void setBotId(String botId) {}

  global void setBotProfile(Slack.BotProfile botProfile) {}

  global void setClientMsgId(String clientMsgId) {}

  global void setPermalink(String permalink) {}

  global void setPinnedTo(List<String> pinnedTo) {}

  global void setTeam(String team) {}

  global void setText(String text) {}

  global void setTs(String ts) {}

  global void setType(String type) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global String getPinnedBy() {}

  global Long getPinnedTs() {}

  global void setChannel(String channel) {}

  global void setPinnedBy(String pinnedBy) {}

  global void setPinnedTs(Long pinnedTs) {}

  global String getChannelId() {}

  global String getEventTs() {}

  global Slack.PinRemovedEvent.Item getItem() {}

  global String getItemUser() {}

  global Integer getPinCount() {}

  global Slack.PinRemovedEvent.PinnedInfo getPinnedInfo() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUser() {}

  global Boolean isHasPins() {}

  global void setChannelId(String channelId) {}

  global void setEventTs(String eventTs) {}

  global void setHasPins(Boolean hasPins) {}

  global void setItem(Slack.PinRemovedEvent.Item item) {}

  global void setItemUser(String itemUser) {}

  global void setPinCount(Integer pinCount) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global Slack.FileComment getComment() {}

  global Integer getCreated() {}

  global String getCreatedBy() {}

  global Slack.File getFile() {}

  global Slack.PinRemovedEvent.Message getMessage() {}

  global String getType() {}

  global void setChannel(String channel) {}

  global void setComment(Slack.FileComment comment) {}

  global void setCreated(Integer created) {}

  global void setCreatedBy(String createdBy) {}

  global void setFile(Slack.File file) {}

  global void setMessage(Slack.PinRemovedEvent.Message message) {}

  global void setType(String type) {}

  global String getAppId() {}

  global String getBotId() {}

  global Slack.BotProfile getBotProfile() {}

  global String getClientMsgId() {}

  global String getPermalink() {}

  global List<String> getPinnedTo() {}

  global String getTeam() {}

  global String getText() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global void setAppId(String appId) {}

  global void setBotId(String botId) {}

  global void setBotProfile(Slack.BotProfile botProfile) {}

  global void setClientMsgId(String clientMsgId) {}

  global void setPermalink(String permalink) {}

  global void setPinnedTo(List<String> pinnedTo) {}

  global void setTeam(String team) {}

  global void setText(String text) {}

  global void setTs(String ts) {}

  global void setType(String type) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global String getPinnedBy() {}

  global Long getPinnedTs() {}

  global void setChannel(String channel) {}

  global void setPinnedBy(String pinnedBy) {}

  global void setPinnedTs(Long pinnedTs) {}

  global String getEventTs() {}

  global Slack.ReactionAddedEvent.Item getItem() {}

  global String getItemUser() {}

  global String getReaction() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUser() {}

  global void setEventTs(String eventTs) {}

  global void setItem(Slack.ReactionAddedEvent.Item item) {}

  global void setItemUser(String itemUser) {}

  global void setReaction(String reaction) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global String getFile() {}

  global String getFileComment() {}

  global String getTs() {}

  global String getType() {}

  global void setChannel(String channel) {}

  global void setFile(String file) {}

  global void setFileComment(String fileComment) {}

  global void setTs(String ts) {}

  global void setType(String type) {}

  global String getEventTs() {}

  global Slack.ReactionRemovedEvent.Item getItem() {}

  global String getItemUser() {}

  global String getReaction() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUser() {}

  global void setEventTs(String eventTs) {}

  global void setItem(Slack.ReactionRemovedEvent.Item item) {}

  global void setItemUser(String itemUser) {}

  global void setReaction(String reaction) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global String getFile() {}

  global String getFileComment() {}

  global String getTs() {}

  global String getType() {}

  global void setChannel(String channel) {}

  global void setFile(String file) {}

  global void setFileComment(String fileComment) {}

  global void setTs(String ts) {}

  global void setType(String type) {}

  global String getEventTs() {}

  global Slack.StarAddedEvent.Item getItem() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUser() {}

  global void setEventTs(String eventTs) {}

  global void setItem(Slack.StarAddedEvent.Item item) {}

  global void setUser(String user) {}

  global String getTs() {}

  global String getUser() {}

  global void setTs(String ts) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global Slack.FileComment getComment() {}

  global String getCreatedBy() {}

  global Long getDateCreate() {}

  global Slack.File getFile() {}

  global Slack.StarAddedEvent.Message getMessage() {}

  global String getType() {}

  global void setChannel(String channel) {}

  global void setComment(Slack.FileComment comment) {}

  global void setCreatedBy(String createdBy) {}

  global void setDateCreate(Long dateCreate) {}

  global void setFile(Slack.File file) {}

  global void setMessage(Slack.StarAddedEvent.Message message) {}

  global void setType(String type) {}

  global String getAppId() {}

  global String getBotId() {}

  global Slack.BotProfile getBotProfile() {}

  global String getClientMsgId() {}

  global Slack.StarAddedEvent.Edited getEdited() {}

  global String getPermalink() {}

  global List<String> getPinnedTo() {}

  global String getTeam() {}

  global String getText() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global Boolean isStarred() {}

  global void setAppId(String appId) {}

  global void setBotId(String botId) {}

  global void setBotProfile(Slack.BotProfile botProfile) {}

  global void setClientMsgId(String clientMsgId) {}

  global void setEdited(Slack.StarAddedEvent.Edited edited) {}

  global void setPermalink(String permalink) {}

  global void setPinnedTo(List<String> pinnedTo) {}

  global void setStarred(Boolean isStarred) {}

  global void setTeam(String team) {}

  global void setText(String text) {}

  global void setTs(String ts) {}

  global void setType(String type) {}

  global void setUser(String user) {}

  global String getEventTs() {}

  global Slack.StarRemovedEvent.Item getItem() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUser() {}

  global void setEventTs(String eventTs) {}

  global void setItem(Slack.StarRemovedEvent.Item item) {}

  global void setUser(String user) {}

  global String getEventTs() {}

  global Slack.StarRemovedEvent.Item getItem() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUser() {}

  global void setEventTs(String eventTs) {}

  global void setItem(Slack.StarRemovedEvent.Item item) {}

  global void setUser(String user) {}

  global String getChannel() {}

  global Slack.FileComment getComment() {}

  global String getCreatedBy() {}

  global Long getDateCreate() {}

  global Slack.File getFile() {}

  global Slack.StarRemovedEvent.Message getMessage() {}

  global String getType() {}

  global void setChannel(String channel) {}

  global void setComment(Slack.FileComment comment) {}

  global void setCreatedBy(String createdBy) {}

  global void setDateCreate(Long dateCreate) {}

  global void setFile(Slack.File file) {}

  global void setMessage(Slack.StarRemovedEvent.Message message) {}

  global void setType(String type) {}

  global String getAppId() {}

  global String getBotId() {}

  global Slack.BotProfile getBotProfile() {}

  global String getClientMsgId() {}

  global Slack.StarRemovedEvent.Edited getEdited() {}

  global String getPermalink() {}

  global List<String> getPinnedTo() {}

  global String getTeam() {}

  global String getText() {}

  global String getTs() {}

  global String getType() {}

  global String getUser() {}

  global void setAppId(String appId) {}

  global void setBotId(String botId) {}

  global void setBotProfile(Slack.BotProfile botProfile) {}

  global void setClientMsgId(String clientMsgId) {}

  global void setEdited(Slack.StarRemovedEvent.Edited edited) {}

  global void setPermalink(String permalink) {}

  global void setPinnedTo(List<String> pinnedTo) {}

  global void setTeam(String team) {}

  global void setText(String text) {}

  global void setTs(String ts) {}

  global void setType(String type) {}

  global void setUser(String user) {}

  global String getEventTs() {}

  global Slack.SubteamCreatedEvent.Subteam getSubteam() {}

  global String getSubtype() {}

  global String getType() {}

  global void setEventTs(String eventTs) {}

  global void setSubteam(Slack.SubteamCreatedEvent.Subteam subteam) {}

  global List<String> getChannels() {}

  global void setChannels(List<String> channels) {}

  global void setGroups(List<String> groups) {}

  global String getAutoType() {}

  global Integer getChannelCount() {}

  global String getCreatedBy() {}

  global Integer getDateCreate() {}

  global Integer getDateDelete() {}

  global Integer getDateUpdate() {}

  global String getDeletedBy() {}

  global String getDescription() {}

  global String getEnterpriseSubteamId() {}

  global String getHandle() {}

  global String getId() {}

  global String getName() {}

  global Slack.SubteamCreatedEvent.Prefs getPrefs() {}

  global String getTeamId() {}

  global String getUpdatedBy() {}

  global Integer getUserCount() {}

  global List<String> getUsers() {}

  global Boolean isAutoProvision() {}

  global Boolean isExternal() {}

  global Boolean isSubteam() {}

  global Boolean isUsergroup() {}

  global void setAutoProvision(Boolean autoProvision) {}

  global void setAutoType(String autoType) {}

  global void setChannelCount(Integer channelCount) {}

  global void setCreatedBy(String createdBy) {}

  global void setDateCreate(Integer dateCreate) {}

  global void setDateDelete(Integer dateDelete) {}

  global void setDateUpdate(Integer dateUpdate) {}

  global void setDeletedBy(String deletedBy) {}

  global void setDescription(String description) {}

  global void setEnterpriseSubteamId(String enterpriseSubteamId) {}

  global void setExternal(Boolean external) {}

  global void setHandle(String handle) {}

  global void setId(String id) {}

  global void setName(String name) {}

  global void setPrefs(Slack.SubteamCreatedEvent.Prefs prefs) {}

  global void setSubteam(Boolean isSubteam) {}

  global void setTeamId(String teamId) {}

  global void setUpdatedBy(String updatedBy) {}

  global void setUserCount(Integer userCount) {}

  global void setUsergroup(Boolean isUsergroup) {}

  global void setUsers(List<String> users) {}

  global List<String> getAddedUsers() {}

  global Integer getAddedUsersCount() {}

  global Integer getDatePreviousUpdate() {}

  global Integer getDateUpdate() {}

  global String getEventTs() {}

  global List<String> getRemovedUsers() {}

  global Integer getRemovedUsersCount() {}

  global String getSubteamId() {}

  global String getSubtype() {}

  global String getTeamId() {}

  global String getType() {}

  global void setAddedUsers(List<String> addedUsers) {}

  global void setAddedUsersCount(Integer addedUsersCount) {}

  global void setDatePreviousUpdate(Integer datePreviousUpdate) {}

  global void setDateUpdate(Integer dateUpdate) {}

  global void setEventTs(String eventTs) {}

  global void setRemovedUsers(List<String> removedUsers) {}

  global void setRemovedUsersCount(Integer removedUsersCount) {}

  global void setSubteamId(String subteamId) {}

  global void setTeamId(String teamId) {}

  global String getEventTs() {}

  global String getSubteamId() {}

  global String getSubtype() {}

  global String getType() {}

  global void setEventTs(String eventTs) {}

  global void setSubteamId(String subteamId) {}

  global String getEventTs() {}

  global String getSubteamId() {}

  global String getSubtype() {}

  global String getType() {}

  global void setEventTs(String eventTs) {}

  global void setSubteamId(String subteamId) {}

  global String getEventTs() {}

  global Slack.SubteamUpdatedEvent.Subteam getSubteam() {}

  global String getSubtype() {}

  global String getType() {}

  global void setEventTs(String eventTs) {}

  global void setSubteam(Slack.SubteamUpdatedEvent.Subteam subteam) {}

  global List<String> getChannels() {}

  global List<String> getGroups() {}

  global void setChannels(List<String> channels) {}

  global void setGroups(List<String> groups) {}

  global String getAutoType() {}

  global Integer getChannelCount() {}

  global String getCreatedBy() {}

  global Integer getDateCreate() {}

  global Integer getDateDelete() {}

  global Integer getDateUpdate() {}

  global String getDeletedBy() {}

  global String getDescription() {}

  global String getEnterpriseSubteamId() {}

  global String getHandle() {}

  global String getId() {}

  global String getName() {}

  global Slack.SubteamUpdatedEvent.Prefs getPrefs() {}

  global String getTeamId() {}

  global String getUpdatedBy() {}

  global Integer getUserCount() {}

  global List<String> getUsers() {}

  global Boolean isAutoProvision() {}

  global Boolean isExternal() {}

  global Boolean isSubteam() {}

  global Boolean isUsergroup() {}

  global void setAutoProvision(Boolean autoProvision) {}

  global void setAutoType(String autoType) {}

  global void setChannelCount(Integer channelCount) {}

  global void setCreatedBy(String createdBy) {}

  global void setDateCreate(Integer dateCreate) {}

  global void setDateDelete(Integer dateDelete) {}

  global void setDateUpdate(Integer dateUpdate) {}

  global void setDeletedBy(String deletedBy) {}

  global void setDescription(String description) {}

  global void setEnterpriseSubteamId(String enterpriseSubteamId) {}

  global void setExternal(Boolean isExternal) {}

  global void setHandle(String handle) {}

  global void setId(String id) {}

  global void setName(String name) {}

  global void setPrefs(Slack.SubteamUpdatedEvent.Prefs prefs) {}

  global void setSubteam(Boolean isSubteam) {}

  global void setTeamId(String teamId) {}

  global void setUpdatedBy(String updatedBy) {}

  global void setUserCount(Integer userCount) {}

  global void setUsergroup(Boolean isUsergroup) {}

  global void setUsers(List<String> users) {}

  global String getEventTs() {}

  global String getSubtype() {}

  global List<String> getTeamIds() {}

  global String getType() {}

  global void setEventTs(String eventTs) {}

  global void setTeamIds(List<String> teamIds) {}

  global String getEventTs() {}

  global String getSubtype() {}

  global List<String> getTeamIds() {}

  global String getType() {}

  global void setEventTs(String eventTs) {}

  global void setTeamIds(List<String> teamIds) {}

  global String getDomain() {}

  global String getSubtype() {}

  global String getType() {}

  global String getUrl() {}

  global void setDomain(String domain) {}

  global void setUrl(String url) {}

  global String getSubtype() {}

  global String getType() {}

  global Slack.User getUser() {}

  global void setUser(Slack.User user) {}

  global String getName() {}

  global String getSubtype() {}

  global String getType() {}

  global void setName(String name) {}

  global String getSubtype() {}

  global Slack.TokensRevokedEvent.Tokens getTokens() {}

  global String getType() {}

  global void setTokens(Slack.TokensRevokedEvent.Tokens tokens) {}

  global List<String> getBot() {}

  global List<String> getOauth() {}

  global void setBot(List<String> bot) {}

  global void setOauth(List<String> oauth) {}

  global Integer getCacheTs() {}

  global String getSubtype() {}

  global String getType() {}

  global Slack.User getUser() {}

  global void setCacheTs(Integer cacheTs) {}

  global List<String> getScopes() {}

  global String getSubtype() {}

  global String getTriggerId() {}

  global String getType() {}

  global String getUser() {}

  global void setScopes(List<String> scopes) {}

  global void setTriggerId(String triggerId) {}

  global void setUser(String user) {}

  global List<String> getScopes() {}

  global String getSubtype() {}

  global String getTriggerId() {}

  global String getType() {}

  global String getUser() {}

  global void setScopes(List<String> scopes) {}

  global void setTriggerId(String triggerId) {}

  global void setUser(String user) {}

  global String getSubtype() {}

  global String getTriggerId() {}

  global String getUser() {}

  global void setTriggerId(String triggerId) {}

  global void setUser(String user) {}

}