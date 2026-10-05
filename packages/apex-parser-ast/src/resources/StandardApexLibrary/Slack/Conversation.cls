global class Conversation {
    global Conversation() { }

    global virtual Boolean equals(Object o) { return false; }

    global List getConnectedLimitedTeamIds() { return null; }

    global List getConnectedTeamIds() { return null; }

    global String getContextTeamId() { return null; }

    global String getConversationHostId() { return null; }

    global Integer getCreated() { return 0; }

    global String getCreator() { return null; }

    global Integer getDateConnected() { return 0; }

    global String getEnterpriseId() { return null; }

    global String getId() { return null; }

    global List getInternalTeamIds() { return null; }

    global Integer getIsMoved() { return 0; }

    global Boolean getIsUserDeleted() { return false; }

    global String getLastRead() { return null; }

    global Slack.Latest getLatest() { return null; }

    global String getLocale() { return null; }

    global String getName() { return null; }

    global String getNameNormalized() { return null; }

    global Integer getNumOfMembers() { return 0; }

    global String getParentConversation() { return null; }

    global List getPendingConnectedTeamIds() { return null; }

    global List getPendingShared() { return null; }

    global List getPreviousNames() { return null; }

    global Double getPriority() { return 0.0; }

    global Slack.Purpose getPurpose() { return null; }

    global List getSharedTeamIds() { return null; }

    global Slack.Topic getTopic() { return null; }

    global Integer getUnlinked() { return 0; }

    global Integer getUnreadCount() { return 0; }

    global Integer getUnreadCountDisplay() { return 0; }

    global Long getUpdated() { return 0L; }

    global String getUser() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isArchived() { return false; }

    global Boolean isChannel() { return false; }

    global Boolean isExtShared() { return false; }

    global Boolean isGeneral() { return false; }

    global Boolean isGlobalShared() { return false; }

    global Boolean isGroup() { return false; }

    global Boolean isIm() { return false; }

    global Boolean isMember() { return false; }

    global Boolean isMpim() { return false; }

    global Boolean isNonThreadable() { return false; }

    global Boolean isOpen() { return false; }

    global Boolean isOrgDefault() { return false; }

    global Boolean isOrgMandatory() { return false; }

    global Boolean isOrgShared() { return false; }

    global Boolean isPendingExtShared() { return false; }

    global Boolean isPrivate() { return false; }

    global Boolean isReadOnly() { return false; }

    global Boolean isShared() { return false; }

    global Boolean isStarred() { return false; }

    global Boolean isThreadOnly() { return false; }

    global void setArchived(Boolean isArchived) { }

    global void setChannel(Boolean isChannel) { }

    global void setConnectedLimitedTeamIds(List connectedLimitedTeamIds) { }

    global void setConnectedTeamIds(List connectedTeamIds) { }

    global void setContextTeamId(String contextTeamId) { }

    global void setConversationHostId(String conversationHostId) { }

    global void setCreated(Integer created) { }

    global void setCreator(String creator) { }

    global void setDateConnected(Integer dateConnected) { }

    global void setEnterpriseId(String enterpriseId) { }

    global void setExtShared(Boolean isExtShared) { }

    global void setGeneral(Boolean isGeneral) { }

    global void setGlobalShared(Boolean globalShared) { }

    global void setGroup(Boolean isGroup) { }

    global void setId(String id) { }

    global void setIm(Boolean isIm) { }

    global void setInternalTeamIds(List internalTeamIds) { }

    global void setIsMoved(Integer isMoved) { }

    global void setIsUserDeleted(Boolean isUserDeleted) { }

    global void setLastRead(String lastRead) { }

    global void setLatest(Slack.Latest latest) { }

    global void setLocale(String locale) { }

    global void setMember(Boolean isMember) { }

    global void setMpim(Boolean isMpim) { }

    global void setName(String name) { }

    global void setNameNormalized(String nameNormalized) { }

    global void setNonThreadable(Boolean isNonThreadable) { }

    global void setNumOfMembers(Integer numOfMembers) { }

    global void setOpen(Boolean open) { }

    global void setOrgDefault(Boolean orgDefault) { }

    global void setOrgMandatory(Boolean orgMandatory) { }

    global void setOrgShared(Boolean isOrgShared) { }

    global void setParentConversation(String parentConversation) { }

    global void setPendingConnectedTeamIds(List pendingConnectedTeamIds) { }

    global void setPendingExtShared(Boolean isPendingExtShared) { }

    global void setPendingShared(List pendingShared) { }

    global void setPreviousNames(List previousNames) { }

    global void setPriority(Double priority) { }

    global void setPrivate(Boolean isPrivate) { }

    global void setPurpose(Slack.Purpose purpose) { }

    global void setReadOnly(Boolean isReadOnly) { }

    global void setShared(Boolean isShared) { }

    global void setSharedTeamIds(List sharedTeamIds) { }

    global void setStarred(Boolean isStarred) { }

    global void setThreadOnly(Boolean isThreadOnly) { }

    global void setTopic(Slack.Topic topic) { }

    global void setUnlinked(Integer unlinked) { }

    global void setUnreadCount(Integer unreadCount) { }

    global void setUnreadCountDisplay(Integer unreadCountDisplay) { }

    global void setUpdated(Long updated) { }

    global void setUser(String user) { }

    global override String toString() { return null; }
}