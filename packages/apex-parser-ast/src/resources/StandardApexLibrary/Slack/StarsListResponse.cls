global class StarsListResponse {
    global Object StarsListResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getError() { return null; }

    global Map getHttpResponseHeaders() { return null; }

    global List getItems() { return null; }

    global String getNeeded() { return null; }

    global Slack.Paging getPaging() { return null; }

    global String getProvided() { return null; }

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

    global void setWarning(String warning) { }

    global override String toString() { return null; }

    global class Comment {
        global Object Comment() { return null; }

        global Slack.StarsListResponse.Comment clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getComment() { return null; }

        global Integer getCreated() { return 0; }

        global String getId() { return null; }

        global Integer getNumStars() { return 0; }

        global Integer getTimestamp() { return 0; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isIntro() { return false; }

        global Boolean isStarred() { return false; }

        global void setComment(String comment) { }

        global void setCreated(Integer created) { }

        global void setId(String id) { }

        global void setIntro(Boolean intro) { }

        global void setNumStars(Integer numStars) { }

        global void setStarred(Boolean starred) { }

        global void setTimestamp(Integer timestamp) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }

    global class Edited {
        global Object Edited() { return null; }

        global Slack.StarsListResponse.Edited clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }

    global class Item {
        global Object Item() { return null; }

        global Slack.StarsListResponse.Item clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getChannel() { return null; }

        global Slack.StarsListResponse.Comment getComment() { return null; }

        global Integer getDateCreate() { return 0; }

        global Slack.File getFile() { return null; }

        global Slack.StarsListResponse.Message getMessage() { return null; }

        global String getType() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setChannel(String channel) { }

        global void setComment(Slack.StarsListResponse.Comment comment) { }

        global void setDateCreate(Integer dateCreate) { }

        global void setFile(Slack.File file) { }

        global void setMessage(Slack.StarsListResponse.Message message) { }

        global void setType(String type) { }

        global override virtual String toString() { return null; }
    }

    global class Message {
        global Object Message() { return null; }

        global Slack.StarsListResponse.Message clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getBotId() { return null; }

        global Slack.BotProfile getBotProfile() { return null; }

        global String getClientMsgId() { return null; }

        global Boolean getDisplayAsBot() { return false; }

        global Slack.StarsListResponse.Edited getEdited() { return null; }

        global List getFiles() { return null; }

        global String getInviter() { return null; }

        global String getLastRead() { return null; }

        global String getLatestReply() { return null; }

        global String getPermalink() { return null; }

        global List getReactions() { return null; }

        global Integer getReplyCount() { return 0; }

        global List getReplyUsers() { return null; }

        global Integer getReplyUsersCount() { return 0; }

        global String getSubtype() { return null; }

        global String getTeam() { return null; }

        global String getText() { return null; }

        global String getThreadTs() { return null; }

        global String getTs() { return null; }

        global String getType() { return null; }

        global Boolean getUpload() { return false; }

        global String getUser() { return null; }

        global String getUsername() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isLocked() { return false; }

        global Boolean isStarred() { return false; }

        global Boolean isSubscribed() { return false; }

        global void setBotId(String botId) { }

        global void setBotProfile(Slack.BotProfile botProfile) { }

        global void setClientMsgId(String clientMsgId) { }

        global void setDisplayAsBot(Boolean displayAsBot) { }

        global void setEdited(Slack.StarsListResponse.Edited edited) { }

        global void setFiles(List files) { }

        global void setInviter(String inviter) { }

        global void setLastRead(String lastRead) { }

        global void setLatestReply(String latestReply) { }

        global void setLocked(Boolean locked) { }

        global void setPermalink(String permalink) { }

        global void setReactions(List reactions) { }

        global void setReplyCount(Integer replyCount) { }

        global void setReplyUsers(List replyUsers) { }

        global void setReplyUsersCount(Integer replyUsersCount) { }

        global void setStarred(Boolean starred) { }

        global void setSubscribed(Boolean subscribed) { }

        global void setSubtype(String subtype) { }

        global void setTeam(String team) { }

        global void setText(String text) { }

        global void setThreadTs(String threadTs) { }

        global void setTs(String ts) { }

        global void setType(String type) { }

        global void setUpload(Boolean upload) { }

        global void setUser(String user) { }

        global void setUsername(String username) { }

        global override virtual String toString() { return null; }
    }

    global class MessageRootReply {
        global Object MessageRootReply() { return null; }

        global Slack.StarsListResponse.MessageRootReply clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getTs() { return null; }

        global String getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setTs(String ts) { }

        global void setUser(String user) { }

        global override virtual String toString() { return null; }
    }
}