global class Dnd {

  global static Slack.DndEndDndRequest.Builder builder() {}

  global Slack.DndEndDndRequest build() {}

  global static Slack.DndEndSnoozeRequest.Builder builder() {}

  global Slack.DndEndSnoozeRequest build() {}

  global Integer getNextDndEndTs() {}

  global Integer getNextDndStartTs() {}

  global Boolean isDndEnabled() {}

  global Boolean isSnoozeEnabled() {}

  global void setDndEnabled(Boolean dndEnabled) {}

  global void setNextDndEndTs(Integer nextDndEndTs) {}

  global void setNextDndStartTs(Integer nextDndStartTs) {}

  global void setSnoozeEnabled(Boolean snoozeEnabled) {}

  global static Slack.DndInfoRequest.Builder builder() {}

  global Slack.DndInfoRequest build() {}

  global Slack.DndInfoRequest.Builder user(String user) {}

  global Slack.DndInfoRequest.Builder teamId(String teamId) {}

  global Integer getSnoozeEndtime() {}

  global Integer getSnoozeRemaining() {}

  global void setSnoozeEndtime(Integer snoozeEndtime) {}

  global void setSnoozeRemaining(Integer snoozeRemaining) {}

  global static Slack.DndSetSnoozeRequest.Builder builder() {}

  global Slack.DndSetSnoozeRequest build() {}

  global Slack.DndSetSnoozeRequest.Builder numMinutes(Integer numMinutes) {}

  global static Slack.DndTeamInfoRequest.Builder builder() {}

  global Slack.DndTeamInfoRequest build() {}

  global Slack.DndTeamInfoRequest.Builder teamId(String teamId) {}

  global Slack.DndTeamInfoRequest.Builder users(List<String> users) {}

  global Map<String,Slack.DndTeamInfoResponse.DndTeamMemberInfo> getUsers() {}

  global void setUsers(Slack.DndTeamInfoResponse.DndTeamMemberInfo> users) {}

}