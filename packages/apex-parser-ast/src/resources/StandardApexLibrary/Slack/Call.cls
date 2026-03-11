global class Call {

  global List<String> getChannels() {}

  global Integer getDateEnd() {}

  global Integer getDateStart() {}

  global String getDesktopAppJoinUrl() {}

  global String getExternalDisplayId() {}

  global String getExternalUniqueId() {}

  global String getId() {}

  global String getJoinUrl() {}

  global String getTitle() {}

  global List<Slack.CallParticipant> getUsers() {}

  global void setChannels(List<String> channels) {}

  global void setDateEnd(Integer dateEnd) {}

  global void setDateStart(Integer dateStart) {}

  global void setDesktopAppJoinUrl(String desktopAppJoinUrl) {}

  global void setExternalDisplayId(String externalDisplayId) {}

  global void setExternalUniqueId(String externalUniqueId) {}

  global void setId(String id) {}

  global void setJoinUrl(String joinUrl) {}

  global void setTitle(String title) {}

  global void setUsers(List<Slack.CallParticipant> users) {}

  global String getAvatarUrl() {}

  global String getDisplayName() {}

  global String getExternalId() {}

  global String getSlackId() {}

  global void setAvatarUrl(String avatarUrl) {}

  global void setDisplayName(String displayName) {}

  global void setExternalId(String externalId) {}

  global void setSlackId(String slackId) {}

  global static Slack.CallsAddRequest.Builder builder() {}

  global Slack.CallsAddRequest build() {}

  global Slack.CallsAddRequest.Builder createdBy(String createdBy) {}

  global Slack.CallsAddRequest.Builder dateStart(Integer dateStart) {}

  global Slack.CallsAddRequest.Builder desktopAppJoinUrl(String desktopAppJoinUrl) {}

  global Slack.CallsAddRequest.Builder externalDisplayId(String externalDisplayId) {}

  global Slack.CallsAddRequest.Builder externalUniqueId(String externalUniqueId) {}

  global Slack.CallsAddRequest.Builder title(String title) {}

  global Slack.CallsAddRequest.Builder users(List<Slack.CallParticipant> users) {}

  global Slack.Call getCall() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setCall(Slack.Call call) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.CallsEndRequest.Builder builder() {}

  global Slack.CallsEndRequest build() {}

  global Slack.CallsEndRequest.Builder duration(Integer duration) {}

  global Slack.CallsEndRequest.Builder id(String id) {}

  global Slack.Call getCall() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setCall(Slack.Call call) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.CallsInfoRequest.Builder builder() {}

  global Slack.CallsInfoRequest build() {}

  global Slack.CallsInfoRequest.Builder id(String id) {}

  global Slack.Call getCall() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setCall(Slack.Call call) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.CallsParticipantsAddRequest.Builder builder() {}

  global Slack.CallsParticipantsAddRequest build() {}

  global Slack.CallsParticipantsAddRequest.Builder id(String id) {}

  global Slack.CallsParticipantsAddRequest.Builder users(List<Slack.CallParticipant> users) {}

  global Slack.Call getCall() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setCall(Slack.Call call) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.CallsParticipantsRemoveRequest.Builder builder() {}

  global Slack.CallsParticipantsRemoveRequest build() {}

  global Slack.CallsParticipantsRemoveRequest.Builder id(String id) {}

  global Slack.CallsParticipantsRemoveRequest.Builder users(List<Slack.CallParticipant> users) {}

  global Slack.Call getCall() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setCall(Slack.Call call) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

  global static Slack.CallsUpdateRequest.Builder builder() {}

  global Slack.CallsUpdateRequest build() {}

  global Slack.CallsUpdateRequest.Builder desktopAppJoinUrl(String desktopAppJoinUrl) {}

  global Slack.CallsUpdateRequest.Builder id(String id) {}

  global Slack.CallsUpdateRequest.Builder joinUrl(String joinUrl) {}

  global Slack.CallsUpdateRequest.Builder title(String title) {}

  global Slack.Call getCall() {}

  global Slack.ResponseMetadata getResponseMetadata() {}

  global void setCall(Slack.Call call) {}

  global void setResponseMetadata(Slack.ResponseMetadata responseMetadata) {}

}