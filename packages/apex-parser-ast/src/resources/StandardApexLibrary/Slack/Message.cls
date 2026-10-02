global class Message {
    global Object Message() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getAppId() { return null; }

    global String getBotId() { return null; }

    global String getBotLink() { return null; }

    global Slack.BotProfile getBotProfile() { return null; }

    global String getChannel() { return null; }

    global String getClientMsgId() { return null; }

    global Slack.Message.MessageItem getComment() { return null; }

    global Slack.Message.Edited getEdited() { return null; }

    global Slack.File getFile() { return null; }

    global List getFiles() { return null; }

    global Slack.Message.Icons getIcons() { return null; }

    global String getInviter() { return null; }

    global Slack.Message.MessageItem getItem() { return null; }

    global String getItemType() { return null; }

    global String getLastRead() { return null; }

    global String getLatestReply() { return null; }

    global Slack.Message.Metadata getMetadata() { return null; }

    global String getParentUserId() { return null; }

    global List getPinnedTo() { return null; }

    global String getPurpose() { return null; }

    global List getReactions() { return null; }

    global Integer getReplyCount() { return 0; }

    global List getReplyUsers() { return null; }

    global Integer getReplyUsersCount() { return 0; }

    global Slack.Message.MessageRoot getRoot() { return null; }

    global String getSubtype() { return null; }

    global String getTeam() { return null; }

    global String getText() { return null; }

    global String getThreadTs() { return null; }

    global String getTopic() { return null; }

    global String getTs() { return null; }

    global String getType() { return null; }

    global String getUser() { return null; }

    global String getUsername() { return null; }

    global List getXFiles() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isDisplayAsBot() { return false; }

    global Boolean isHidden() { return false; }

    global Boolean isIntro() { return false; }

    global Boolean isLocked() { return false; }

    global Boolean isStarred() { return false; }

    global Boolean isSubscribed() { return false; }

    global Boolean isThreadBroadcast() { return false; }

    global Boolean isUnfurlLinks() { return false; }

    global Boolean isUnfurlMedia() { return false; }

    global Boolean isUpload() { return false; }

    global Boolean isWibblr() { return false; }

    global void setAppId(String appId) { }

    global void setBotId(String botId) { }

    global void setBotLink(String botLink) { }

    global void setBotProfile(Slack.BotProfile botProfile) { }

    global void setChannel(String channel) { }

    global void setClientMsgId(String clientMsgId) { }

    global void setComment(Slack.Message.MessageItem comment) { }

    global void setDisplayAsBot(Boolean displayAsBot) { }

    global void setEdited(Slack.Message.Edited edited) { }

    global void setFile(Slack.File file) { }

    global void setFiles(List files) { }

    global void setHidden(Boolean hidden) { }

    global void setIcons(Slack.Message.Icons icons) { }

    global void setIntro(Boolean intro) { }

    global void setInviter(String inviter) { }

    global void setItem(Slack.Message.MessageItem item) { }

    global void setItemType(String itemType) { }

    global void setLastRead(String lastRead) { }

    global void setLatestReply(String latestReply) { }

    global void setLocked(Boolean locked) { }

    global void setMetadata(Slack.Message.Metadata metadata) { }

    global void setParentUserId(String parentUserId) { }

    global void setPinnedTo(List pinnedTo) { }

    global void setPurpose(String purpose) { }

    global void setReactions(List reactions) { }

    global void setReplyCount(Integer replyCount) { }

    global void setReplyUsers(List replyUsers) { }

    global void setReplyUsersCount(Integer replyUsersCount) { }

    global void setRoot(Slack.Message.MessageRoot root) { }

    global void setStarred(Boolean starred) { }

    global void setSubscribed(Boolean subscribed) { }

    global void setSubtype(String subtype) { }

    global void setTeam(String team) { }

    global void setText(String text) { }

    global void setThreadBroadcast(Boolean threadBroadcast) { }

    global void setThreadTs(String threadTs) { }

    global void setTopic(String topic) { }

    global void setTs(String ts) { }

    global void setType(String type) { }

    global void setUnfurlLinks(Boolean unfurlLinks) { }

    global void setUnfurlMedia(Boolean unfurlMedia) { }

    global void setUpload(Boolean upload) { }

    global void setUser(String user) { }

    global void setUsername(String username) { }

    global void setWibblr(Boolean wibblr) { }

    global void setXFiles(List xFiles) { }

    global override String toString() { return null; }

    global class Edited {
        global Object Edited() { return null; }

        global Slack.Message.Edited clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }

    global class Icons {
        global Object Icons() { return null; }

        global Slack.Message.Icons clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getEmoji() { return null; }

        global String getImage36() { return null; }

        global String getImage48() { return null; }

        global String getImage64() { return null; }

        global String getImage72() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setEmoji(String emoji) { }

        global void setImage36(String image36) { }

        global void setImage48(String image48) { }

        global void setImage64(String image64) { }

        global void setImage72(String image72) { }

        global override virtual String toString() { return null; }
    }

    global class MessageItem {
        global Object MessageItem() { return null; }

        global Slack.Message.MessageItem clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getComment() { return null; }

        global String getCreated() { return null; }

        global String getEditLink() { return null; }

        global String getExternalType() { return null; }

        global String getFiletype() { return null; }

        global String getId() { return null; }

        global Integer getLines() { return 0; }

        global Integer getLinesMore() { return 0; }

        global String getMediaDisplayType() { return null; }

        global String getMimetype() { return null; }

        global String getMode() { return null; }

        global String getName() { return null; }

        global String getPermalink() { return null; }

        global String getPrettyType() { return null; }

        global String getPreview() { return null; }

        global String getPreviewHighlight() { return null; }

        global Integer getSize() { return 0; }

        global String getTimestamp() { return null; }

        global String getTitle() { return null; }

        global String getUrlPrivate() { return null; }

        global String getUser() { return null; }

        global String getUsername() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isDisplayAsBot() { return false; }

        global Boolean isEditable() { return false; }

        global Boolean isExternal() { return false; }

        global Boolean isHasRichPreview() { return false; }

        global Boolean isIntro() { return false; }

        global Boolean isPermalinkPublic() { return false; }

        global Boolean isPreviewTruncated() { return false; }

        global Boolean isPublicUrlShared() { return false; }

        global Boolean isStarred() { return false; }

        global Boolean isUrlPrivateDownload() { return false; }

        global Boolean ispublic() { return false; }

        global void setComment(String comment) { }

        global void setCreated(String created) { }

        global void setDisplayAsBot(Boolean displayAsBot) { }

        global void setEditLink(String editLink) { }

        global void setEditable(Boolean editable) { }

        global void setExternal(Boolean external) { }

        global void setExternalType(String externalType) { }

        global void setFiletype(String filetype) { }

        global void setHasRichPreview(Boolean hasRichPreview) { }

        global void setId(String id) { }

        global void setIntro(Boolean intro) { }

        global void setLines(Integer lines) { }

        global void setLinesMore(Integer linesMore) { }

        global void setMediaDisplayType(String mediaDisplayType) { }

        global void setMimetype(String mimetype) { }

        global void setMode(String mode) { }

        global void setName(String name) { }

        global void setPermalink(String permalink) { }

        global void setPermalinkPublic(Boolean permalinkPublic) { }

        global void setPrettyType(String prettyType) { }

        global void setPreview(String preview) { }

        global void setPreviewHighlight(String previewHighlight) { }

        global void setPreviewTruncated(Boolean previewTruncated) { }

        global void setPublicUrlShared(Boolean publicUrlShared) { }

        global void setSize(Integer size) { }

        global void setStarred(Boolean starred) { }

        global void setTimestamp(String timestamp) { }

        global void setTitle(String title) { }

        global void setUrlPrivate(String urlPrivate) { }

        global void setUrlPrivateDownload(Boolean urlPrivateDownload) { }

        global void setUser(String user) { }

        global void setUsername(String username) { }

        global void setpublic(Boolean _public) { }

        global override virtual String toString() { return null; }
    }

    global class MessageRoot {
        global Object MessageRoot() { return null; }

        global Slack.Message.MessageRoot clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getBotId() { return null; }

        global Slack.BotProfile getBotProfile() { return null; }

        global Slack.Message.Edited getEdited() { return null; }

        global Slack.Message.Icons getIcons() { return null; }

        global String getLastRead() { return null; }

        global String getLatestReply() { return null; }

        global String getParentUserId() { return null; }

        global Integer getReplyCount() { return 0; }

        global List getReplyUsers() { return null; }

        global Integer getReplyUsersCount() { return 0; }

        global String getSubtype() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getThreadTs() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global Integer getUnreadCount() { return 0; }

        global String getUser() { return null; }

        global String getUsername() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isMrkdwn() { return false; }

        global Boolean isSubscribed() { return false; }

        global void setBotId(String botId) { }

        global void setBotProfile(Slack.BotProfile botProfile) { }

        global void setEdited(Slack.Message.Edited edited) { }

        global void setIcons(Slack.Message.Icons icons) { }

        global void setLastRead(String lastRead) { }

        global void setLatestReply(String latestReply) { }

        global void setMrkdwn(Boolean mrkdwn) { }

        global void setParentUserId(String parentUserId) { }

        global void setReplyCount(Integer replyCount) { }

        global void setReplyUsers(List replyUsers) { }

        global void setReplyUsersCount(Integer replyUsersCount) { }

        global void setSubscribed(Boolean subscribed) { }

        global void setSubtype(String subtype) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setThreadTs(String threadTs) { }

        global void setTs(String ts) { }

        global void setType(String type) { }

        global void setUnreadCount(Integer unreadCount) { }

        global void setUser(String user) { }

        global void setUsername(String username) { }

        global override virtual String toString() { return null; }
    }

    global class MessageRootReply {
        global Object MessageRootReply() { return null; }

        global Slack.Message.MessageRootReply clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }

    global class Metadata {
        global Object Metadata() { return null; }

        global Slack.Message.Metadata clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Map getEventPayload() { return null; }

        global String getEventType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setEventPayload(Map eventPayload) { }

        global void setEventType(String eventType) { }

        global override virtual String toString() { return null; }
    }
}