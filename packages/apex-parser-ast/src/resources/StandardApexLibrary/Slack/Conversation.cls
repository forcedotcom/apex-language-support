global class Conversation {

  global List<String> getConnectedLimitedTeamIds() {}

  global List<String> getConnectedTeamIds() {}

  global String getConversationHostId() {}

  global String getCreated() {}

  global String getCreator() {}

  global Integer getDateConnected() {}

  global String getEnterpriseId() {}

  global String getId() {}

  global List<String> getInternalTeamIds() {}

  global Integer getIsMoved() {}

  global Boolean getIsUserDeleted() {}

  global String getLastRead() {}

  global Slack.Latest getLatest() {}

  global String getLocale() {}

  global String getName() {}

  global String getNameNormalized() {}

  global Integer getNumOfMembers() {}

  global String getParentConversation() {}

  global List<String> getPendingConnectedTeamIds() {}

  global List<String> getPendingShared() {}

  global List<String> getPreviousNames() {}

  global Double getPriority() {}

  global Slack.Purpose getPurpose() {}

  global List<String> getSharedTeamIds() {}

  global Slack.Topic getTopic() {}

  global Integer getUnlinked() {}

  global Integer getUnreadCount() {}

  global Integer getUnreadCountDisplay() {}

  global String getUser() {}

  global Boolean isArchived() {}

  global Boolean isChannel() {}

  global Boolean isExtShared() {}

  global Boolean isGeneral() {}

  global Boolean isGlobalShared() {}

  global Boolean isGroup() {}

  global Boolean isIm() {}

  global Boolean isMember() {}

  global Boolean isMpim() {}

  global Boolean isNonThreadable() {}

  global Boolean isOpen() {}

  global Boolean isOrgDefault() {}

  global Boolean isOrgMandatory() {}

  global Boolean isOrgShared() {}

  global Boolean isPendingExtShared() {}

  global Boolean isPrivate() {}

  global Boolean isReadOnly() {}

  global Boolean isShared() {}

  global Boolean isStarred() {}

  global Boolean isThreadOnly() {}

  global void setIsUserDeleted(Boolean isUserDeleted) {}

  global void setArchived(Boolean isArchived) {}

  global void setChannel(Boolean isChannel) {}

  global void setConnectedLimitedTeamIds(List<String> connectedLimitedTeamIds) {}

  global void setConnectedTeamIds(List<String> connectedTeamIds) {}

  global void setConversationHostId(String conversationHostId) {}

  global void setCreated(String created) {}

  global void setCreator(String creator) {}

  global void setDateConnected(Integer dateConnected) {}

  global void setEnterpriseId(String enterpriseId) {}

  global void setExtShared(Boolean isExtShared) {}

  global void setGeneral(Boolean isGeneral) {}

  global void setGlobalShared(Boolean globalShared) {}

  global void setGroup(Boolean isGroup) {}

  global void setId(String id) {}

  global void setIm(Boolean isIm) {}

  global void setInternalTeamIds(List<String> internalTeamIds) {}

  global void setIsMoved(Integer isMoved) {}

  global void setLastRead(String lastRead) {}

  global void setLatest(Slack.Latest latest) {}

  global void setLocale(String locale) {}

  global void setMember(Boolean isMember) {}

  global void setMpim(Boolean isMpim) {}

  global void setName(String name) {}

  global void setNameNormalized(String nameNormalized) {}

  global void setNonThreadable(Boolean isNonThreadable) {}

  global void setNumOfMembers(Integer numOfMembers) {}

  global void setOpen(Boolean open) {}

  global void setOrgDefault(Boolean orgDefault) {}

  global void setOrgMandatory(Boolean orgMandatory) {}

  global void setOrgShared(Boolean isOrgShared) {}

  global void setParentConversation(String parentConversation) {}

  global void setPendingConnectedTeamIds(List<String> pendingConnectedTeamIds) {}

  global void setPendingExtShared(Boolean isPendingExtShared) {}

  global void setPendingShared(List<String> pendingShared) {}

  global void setPreviousNames(List<String> previousNames) {}

  global void setPriority(Double priority) {}

  global void setPrivate(Boolean isPrivate) {}

  global void setPurpose(Slack.Purpose purpose) {}

  global void setReadOnly(Boolean isReadOnly) {}

  global void setShared(Boolean isShared) {}

  global void setSharedTeamIds(List<String> sharedTeamIds) {}

  global void setStarred(Boolean isStarred) {}

  global void setThreadOnly(Boolean isThreadOnly) {}

  global void setTopic(Slack.Topic topic) {}

  global void setUnlinked(Integer unlinked) {}

  global void setUnreadCount(Integer unreadCount) {}

  global void setUnreadCountDisplay(Integer unreadCountDisplay) {}

  global void setUser(String user) {}

  global static Slack.ConversationsArchiveRequest.Builder builder() {}

  global Slack.ConversationsArchiveRequest build() {}

  global Slack.ConversationsArchiveRequest.Builder channel(String channel) {}

  global static Slack.ConversationsCloseRequest.Builder builder() {}

  global Slack.ConversationsCloseRequest build() {}

  global Slack.ConversationsCloseRequest.Builder channel(String channel) {}

  global Boolean getAlreadyClosed() {}

  global Boolean getNoOp() {}

  global void setAlreadyClosed(Boolean alreadyClosed) {}

  global void setNoOp(Boolean noOp) {}

  global static Slack.ConversationsCreateRequest.Builder builder() {}

  global Slack.ConversationsCreateRequest build() {}

  global Slack.ConversationsCreateRequest.Builder isPrivate(Boolean isPrivate) {}

  global Slack.ConversationsCreateRequest.Builder name(String name) {}

  global Slack.ConversationsCreateRequest.Builder teamId(String teamId) {}

  global Slack.Conversation getChannel() {}

  global String getDetail() {}

  global void setChannel(Slack.Conversation channel) {}

  global void setDetail(String detail) {}

  global static Slack.ConversationsHistoryRequest.Builder builder() {}

  global Slack.ConversationsHistoryRequest build() {}

  global Slack.ConversationsHistoryRequest.Builder channel(String channel) {}

  global Slack.ConversationsHistoryRequest.Builder cursor(String cursor) {}

  global Slack.ConversationsHistoryRequest.Builder inclusive(Boolean inclusive) {}

  global Slack.ConversationsHistoryRequest.Builder latest(String latest) {}

  global Slack.ConversationsHistoryRequest.Builder limitValue(Integer limitValue) {}

  global Slack.ConversationsHistoryRequest.Builder oldest(String oldest) {}

  global Integer getChannelActionsCount() {}

  global String getChannelActionsTs() {}

  global String getLatest() {}

  global List<Slack.Message> getMessages() {}

  global Integer getPinCount() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global Boolean isHasMore() {}

  global void setChannelActionsCount(Integer channelActionsCount) {}

  global void setChannelActionsTs(String channelActionsTs) {}

  global void setHasMore(Boolean hasMore) {}

  global void setLatest(String latest) {}

  global void setMessages(List<Slack.Message> messages) {}

  global void setPinCount(Integer pinCount) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.ConversationsInfoRequest.Builder builder() {}

  global Slack.ConversationsInfoRequest build() {}

  global Slack.ConversationsInfoRequest.Builder channel(String channel) {}

  global Slack.ConversationsInfoRequest.Builder includeLocale(Boolean includeLocale) {}

  global Slack.ConversationsInfoRequest.Builder includeNumMembers(Boolean includeNumMembers) {}

  global Slack.Conversation getChannel() {}

  global void setChannel(Slack.Conversation channel) {}

  global static Slack.ConversationsInviteRequest.Builder builder() {}

  global Slack.ConversationsInviteRequest build() {}

  global Slack.ConversationsInviteRequest.Builder channel(String channel) {}

  global Slack.ConversationsInviteRequest.Builder users(List<String> users) {}

  global Slack.Conversation getChannel() {}

  global List<Slack.ConversationsInviteResponse.Error> getErrors() {}

  global void setChannel(Slack.Conversation channel) {}

  global void setErrors(List<Slack.ConversationsInviteResponse.Error> errors) {}

  global String getError() {}

  global Boolean isOk() {}

  global void setError(String error) {}

  global void setOk(Boolean ok) {}

  global static Slack.ConversationsJoinRequest.Builder builder() {}

  global Slack.ConversationsJoinRequest build() {}

  global Slack.ConversationsJoinRequest.Builder channel(String channel) {}

  global Slack.Conversation getChannel() {}

  global Slack.WarningResponseMetadata getResponseMetadata() {}

  global void setChannel(Slack.Conversation channel) {}

  global void setResponseMetadata(Slack.WarningResponseMetadata responseMetadata) {}

  global static Slack.ConversationsKickRequest.Builder builder() {}

  global Slack.ConversationsKickRequest build() {}

  global Slack.ConversationsKickRequest.Builder channel(String channel) {}

  global Slack.ConversationsKickRequest.Builder user(String user) {}

  global static Slack.ConversationsLeaveRequest.Builder builder() {}

  global Slack.ConversationsLeaveRequest build() {}

  global Slack.ConversationsLeaveRequest.Builder channel(String channel) {}

  global Boolean isNotInChannel() {}

  global void setNotInChannel(Boolean notInChannel) {}

  global static Slack.ConversationsListRequest.Builder builder() {}

  global Slack.ConversationsListRequest build() {}

  global Slack.ConversationsListRequest.Builder cursor(String cursor) {}

  global Slack.ConversationsListRequest.Builder excludeArchived(Boolean excludeArchived) {}

  global Slack.ConversationsListRequest.Builder limitValue(Integer limitValue) {}

  global Slack.ConversationsListRequest.Builder teamId(String teamId) {}

  global Slack.ConversationsListRequest.Builder types(List<Slack.ConversationType> types) {}

  global List<Slack.Conversation> getChannels() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setChannels(List<Slack.Conversation> channels) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.ConversationsMarkRequest.Builder builder() {}

  global Slack.ConversationsMarkRequest build() {}

  global Slack.ConversationsMarkRequest.Builder channel(String channel) {}

  global Slack.ConversationsMarkRequest.Builder ts(String ts) {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.ConversationsMembersRequest.Builder builder() {}

  global Slack.ConversationsMembersRequest build() {}

  global Slack.ConversationsMembersRequest.Builder channel(String channel) {}

  global Slack.ConversationsMembersRequest.Builder cursor(String cursor) {}

  global Slack.ConversationsMembersRequest.Builder limitValue(Integer limitValue) {}

  global List<String> getMembers() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setMembers(List<String> members) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.ConversationsOpenRequest.Builder builder() {}

  global Slack.ConversationsOpenRequest build() {}

  global Slack.ConversationsOpenRequest.Builder channel(String channel) {}

  global Slack.ConversationsOpenRequest.Builder returnIm(Boolean returnIm) {}

  global Slack.ConversationsOpenRequest.Builder users(List<String> users) {}

  global Slack.Conversation getChannel() {}

  global Boolean isAlreadyOpen() {}

  global Boolean isNoOp() {}

  global void setAlreadyOpen(Boolean alreadyOpen) {}

  global void setChannel(Slack.Conversation channel) {}

  global void setNoOp(Boolean noOp) {}

  global static Slack.ConversationsRenameRequest.Builder builder() {}

  global Slack.ConversationsRenameRequest build() {}

  global Slack.ConversationsRenameRequest.Builder channel(String channel) {}

  global Slack.ConversationsRenameRequest.Builder name(String name) {}

  global Slack.Conversation getChannel() {}

  global void setChannel(Slack.Conversation channel) {}

  global static Slack.ConversationsRepliesRequest.Builder builder() {}

  global Slack.ConversationsRepliesRequest build() {}

  global Slack.ConversationsRepliesRequest.Builder channel(String channel) {}

  global Slack.ConversationsRepliesRequest.Builder cursor(String cursor) {}

  global Slack.ConversationsRepliesRequest.Builder inclusive(Boolean inclusive) {}

  global Slack.ConversationsRepliesRequest.Builder latest(String latest) {}

  global Slack.ConversationsRepliesRequest.Builder limitValue(Integer limitValue) {}

  global Slack.ConversationsRepliesRequest.Builder oldest(String oldest) {}

  global Slack.ConversationsRepliesRequest.Builder ts(String ts) {}

  global List<Slack.Message> getMessages() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global Boolean isHasMore() {}

  global void setHasMore(Boolean hasMore) {}

  global void setMessages(List<Slack.Message> messages) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.ConversationsSetPurposeRequest.Builder builder() {}

  global Slack.ConversationsSetPurposeRequest build() {}

  global Slack.ConversationsSetPurposeRequest.Builder channel(String channel) {}

  global Slack.ConversationsSetPurposeRequest.Builder purpose(String purpose) {}

  global Slack.Conversation getChannel() {}

  global void setChannel(Slack.Conversation channel) {}

  global static Slack.ConversationsSetTopicRequest.Builder builder() {}

  global Slack.ConversationsSetTopicRequest build() {}

  global Slack.ConversationsSetTopicRequest.Builder channel(String channel) {}

  global Slack.ConversationsSetTopicRequest.Builder topic(String topic) {}

  global Slack.Conversation getChannel() {}

  global void setChannel(Slack.Conversation channel) {}

  global static Slack.ConversationsUnarchiveRequest.Builder builder() {}

  global Slack.ConversationsUnarchiveRequest build() {}

  global Slack.ConversationsUnarchiveRequest.Builder channel(String channel) {}

}