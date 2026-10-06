global class Channel {
    global Channel() { }

    global virtual Boolean equals(Object o) { return false; }

    global Integer getCreated() { return 0; }

    global String getCreator() { return null; }

    global String getEnterpriseId() { return null; }

    global String getId() { return null; }

    global Integer getIsMoved() { return 0; }

    global String getLastRead() { return null; }

    global Slack.Latest getLatest() { return null; }

    global List getMembers() { return null; }

    global String getName() { return null; }

    global String getNameNormalized() { return null; }

    global Integer getNumMembers() { return 0; }

    global List getPendingShared() { return null; }

    global List getPreviousNames() { return null; }

    global Double getPriority() { return 0.0; }

    global Slack.Purpose getPurpose() { return null; }

    global Slack.Topic getTopic() { return null; }

    global Integer getUnlinked() { return 0; }

    global Integer getUnreadCount() { return 0; }

    global Integer getUnreadCountDisplay() { return 0; }

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

    global Boolean isOrgDefault() { return false; }

    global Boolean isOrgMandatory() { return false; }

    global Boolean isOrgShared() { return false; }

    global Boolean isPendingExtShared() { return false; }

    global Boolean isPrivateChannel() { return false; }

    global Boolean isReadOnly() { return false; }

    global Boolean isShared() { return false; }

    global Boolean isThreadOnly() { return false; }

    global void setArchived(Boolean archived) { }

    global void setChannel(Boolean channel) { }

    global void setCreated(Integer created) { }

    global void setCreator(String creator) { }

    global void setEnterpriseId(String enterpriseId) { }

    global void setExtShared(Boolean extShared) { }

    global void setGeneral(Boolean general) { }

    global void setGlobalShared(Boolean globalShared) { }

    global void setGroup(Boolean groupValue) { }

    global void setId(String id) { }

    global void setIm(Boolean im) { }

    global void setIsMoved(Integer isMoved) { }

    global void setLastRead(String lastRead) { }

    global void setLatest(Slack.Latest latest) { }

    global void setMember(Boolean member) { }

    global void setMembers(List members) { }

    global void setMpim(Boolean mpim) { }

    global void setName(String name) { }

    global void setNameNormalized(String nameNormalized) { }

    global void setNumMembers(Integer numMembers) { }

    global void setOrgDefault(Boolean orgDefault) { }

    global void setOrgMandatory(Boolean orgMandatory) { }

    global void setOrgShared(Boolean orgShared) { }

    global void setPendingExtShared(Boolean pendingExtShared) { }

    global void setPendingShared(List pendingShared) { }

    global void setPreviousNames(List previousNames) { }

    global void setPriority(Double priority) { }

    global void setPrivateChannel(Boolean privateChannel) { }

    global void setPurpose(Slack.Purpose purpose) { }

    global void setReadOnly(Boolean readOnly) { }

    global void setShared(Boolean shared) { }

    global void setThreadOnly(Boolean threadOnly) { }

    global void setTopic(Slack.Topic topic) { }

    global void setUnlinked(Integer unlinked) { }

    global void setUnreadCount(Integer unreadCount) { }

    global void setUnreadCountDisplay(Integer unreadCountDisplay) { }

    global void setUser(String user) { }

    global override String toString() { return null; }
}