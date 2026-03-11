global class Usergroup {

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

  global Slack.Usergroup.Prefs getPrefs() {}

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

  global void setPrefs(Slack.Usergroup.Prefs prefs) {}

  global void setSubteam(Boolean subteam) {}

  global void setTeamId(String teamId) {}

  global void setUpdatedBy(String updatedBy) {}

  global void setUserCount(Integer userCount) {}

  global void setUsergroup(Boolean usergroup) {}

  global void setUsers(List<String> users) {}

  global List<String> getChannels() {}

  global List<String> getGroups() {}

  global void setChannels(List<String> channels) {}

  global void setGroups(List<String> groups) {}

  global static Slack.UsergroupsCreateRequest.Builder builder() {}

  global Slack.UsergroupsCreateRequest build() {}

  global Slack.UsergroupsCreateRequest.Builder channels(List<String> channels) {}

  global Slack.UsergroupsCreateRequest.Builder description(String description) {}

  global Slack.UsergroupsCreateRequest.Builder handle(String handle) {}

  global Slack.UsergroupsCreateRequest.Builder includeCount(Boolean includeCount) {}

  global Slack.UsergroupsCreateRequest.Builder name(String name) {}

  global Slack.UsergroupsCreateRequest.Builder teamId(String teamId) {}

  global Slack.Usergroup getUsergroup() {}

  global void setUsergroup(Slack.Usergroup usergroup) {}

  global Slack.UsergroupsDisableRequest build() {}

  global Slack.UsergroupsDisableRequest.Builder includeCount(Boolean includeCount) {}

  global Slack.UsergroupsDisableRequest.Builder usergroup(String usergroup) {}

  global Slack.UsergroupsDisableRequest.Builder teamId(String teamId) {}

  global static Slack.UsergroupsDisableRequest.Builder builder() {}

  global Slack.Usergroup getUsergroup() {}

  global void setUsergroup(Slack.Usergroup usergroup) {}

  global Slack.UsergroupsEnableRequest build() {}

  global Slack.UsergroupsEnableRequest.Builder usergroup(String usergroup) {}

  global Slack.UsergroupsEnableRequest.Builder usergroup(String usergroup) {}

  global static Slack.UsergroupsEnableRequest.Builder builder() {}

  global Slack.UsergroupsEnableRequest.Builder teamId(String teamId) {}

  global Slack.Usergroup getUsergroup() {}

  global void setUsergroup(Slack.Usergroup usergroup) {}

  global Slack.UsergroupsListRequest build() {}

  global Slack.UsergroupsListRequest.Builder includeCount(Boolean includeCount) {}

  global Slack.UsergroupsListRequest.Builder includeDisabled(Boolean includeDisabled) {}

  global Slack.UsergroupsListRequest.Builder includeUsers(Boolean includeUsers) {}

  global Slack.UsergroupsListRequest.Builder teamId(String teamId) {}

  global static Slack.UsergroupsListRequest.Builder builder() {}

  global List<Slack.Usergroup> getUsergroups() {}

  global void setUsergroups(List<Slack.Usergroup> usergroups) {}

  global Slack.UsergroupsUpdateRequest build() {}

  global Slack.UsergroupsUpdateRequest.Builder channels(List<String> channels) {}

  global Slack.UsergroupsUpdateRequest.Builder description(String description) {}

  global Slack.UsergroupsUpdateRequest.Builder handle(String handle) {}

  global Slack.UsergroupsUpdateRequest.Builder includeCount(Boolean includeCount) {}

  global Slack.UsergroupsUpdateRequest.Builder name(String name) {}

  global Slack.UsergroupsUpdateRequest.Builder teamId(String teamId) {}

  global Slack.UsergroupsUpdateRequest.Builder usergroup(String usergroup) {}

  global static Slack.UsergroupsUpdateRequest.Builder builder() {}

  global Slack.Usergroup getUsergroup() {}

  global void setUsergroup(Slack.Usergroup usergroup) {}

  global Slack.UsergroupsUsersListRequest build() {}

  global Slack.UsergroupsUsersListRequest.Builder includeDisabled(Boolean includeDisabled) {}

  global Slack.UsergroupsUsersListRequest.Builder teamId(String teamId) {}

  global Slack.UsergroupsUsersListRequest.Builder usergroup(String usergroup) {}

  global static Slack.UsergroupsUsersListRequest.Builder builder() {}

  global List<String> getUsers() {}

  global void setUsers(List<String> users) {}

  global Slack.UsergroupsUsersUpdateRequest build() {}

  global Slack.UsergroupsUsersUpdateRequest.Builder includeCount(Boolean includeCount) {}

  global Slack.UsergroupsUsersUpdateRequest.Builder teamId(String teamId) {}

  global Slack.UsergroupsUsersUpdateRequest.Builder usergroup(String usergroup) {}

  global Slack.UsergroupsUsersUpdateRequest.Builder users(List<String> users) {}

  global static Slack.UsergroupsUsersUpdateRequest.Builder builder() {}

  global Slack.Usergroup getUsergroup() {}

  global void setUsergroup(Slack.Usergroup usergroup) {}

}