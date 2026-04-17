global class Team {

  global List<String> getDefaultChannels() {}

  global String getDiscoverable() {}

  global String getDomain() {}

  global String getEmailDomain() {}

  global String getEnterpriseDomain() {}

  global String getEnterpriseId() {}

  global String getEnterpriseName() {}

  global Slack.TeamIcon getIcon() {}

  global String getId() {}

  global Boolean getIsVerified() {}

  global String getName() {}

  global String getUrl() {}

  global void setDefaultChannels(List<String> defaultChannels) {}

  global void setDiscoverable(String discoverable) {}

  global void setDomain(String domain) {}

  global void setEmailDomain(String emailDomain) {}

  global void setEnterpriseId(String enterpriseId) {}

  global void setEnterpriseDomain(String enterpriseDomain) {}

  global void setEnterpriseName(String enterpriseName) {}

  global void setIcon(Slack.TeamIcon icon) {}

  global void setId(String id) {}

  global void setIsVerified(Boolean isVerified) {}

  global void setName(String name) {}

  global void setUrl(String url) {}

  global String getFieldName() {}

  global String getHint() {}

  global String getLabel() {}

  global Slack.Team.ProfileOptions getOptions() {}

  global Integer getOrdering() {}

  global List<String> getPossibleValues() {}

  global String getType() {}

  global Boolean isHidden() {}

  global void setFieldName(String fieldName) {}

  global void setHidden(Boolean hidden) {}

  global void setHint(String hintValue) {}

  global void setLabel(String label) {}

  global void setOptions(Slack.Team.ProfileOptions options) {}

  global void setOrdering(Integer ordering) {}

  global void setPossibleValues(List<String> possibleValues) {}

  global void setType(String type) {}

  global Boolean isprotected() {}

  global void setprotected(Boolean _protected) {}

  global String getImage34() {}

  global String getImage44() {}

  global String getImage68() {}

  global String getImage88() {}

  global String getImage102() {}

  global String getImage132() {}

  global String getImage230() {}

  global String getImageOriginal() {}

  global Boolean isImageDefault() {}

  global void setImage34(String image34) {}

  global void setImage44(String image44) {}

  global void setImage68(String image68) {}

  global void setImage88(String image88) {}

  global void setImage102(String image102) {}

  global void setImage132(String image132) {}

  global void setImage230(String image230) {}

  global void setImageDefault(Boolean imageDefault) {}

  global void setImageOriginal(String imageOriginal) {}

  global Boolean isBillingActive() {}

  global void setBillingActive(Boolean billingActive) {}

  global String getAppId() {}

  global String getAppType() {}

  global String getChangeType() {}

  global String getChannel() {}

  global Integer getDate() {}

  global String getReason() {}

  global String getResolution() {}

  global String getRssFeedChangeType() {}

  global String getRssFeedTitle() {}

  global String getRssFeedUrl() {}

  global String getScope() {}

  global String getServiceId() {}

  global String getServiceType() {}

  global String getUserId() {}

  global String getUserName() {}

  global Boolean isRssFeed() {}

  global void setAppId(String appId) {}

  global void setAppType(String appType) {}

  global void setChangeType(String changeType) {}

  global void setChannel(String channel) {}

  global void setDate(Integer dateValue) {}

  global void setReason(String reason) {}

  global void setResolution(String resolution) {}

  global void setRssFeed(Boolean rssFeed) {}

  global void setRssFeedChangeType(String rssFeedChangeType) {}

  global void setRssFeedTitle(String rssFeedTitle) {}

  global void setRssFeedUrl(String rssFeedUrl) {}

  global void setScope(String scope) {}

  global void setServiceId(String serviceId) {}

  global void setServiceType(String serviceType) {}

  global void setUserId(String userId) {}

  global void setUserName(String userName) {}

  global Integer getCount() {}

  global String getCountry() {}

  global Integer getDateFirst() {}

  global Integer getDateLast() {}

  global String getIp() {}

  global String getIsp() {}

  global String getRegion() {}

  global String getUserAgent() {}

  global String getUsername() {}

  global void setCount(Integer count) {}

  global void setCountry(String country) {}

  global void setDateFirst(Integer dateFirst) {}

  global void setDateLast(Integer dateLast) {}

  global void setIp(String ip) {}

  global void setIsp(String isp) {}

  global void setRegion(String region) {}

  global void setUserAgent(String userAgent) {}

  global void setUsername(String username) {}

  global static Slack.TeamAccessLogsRequest.Builder builder() {}

  global Slack.TeamAccessLogsRequest.Builder before(Integer before) {}

  global Slack.TeamAccessLogsRequest build() {}

  global Slack.TeamAccessLogsRequest.Builder count(Integer count) {}

  global Slack.TeamAccessLogsRequest.Builder page(Integer page) {}

  global Slack.TeamAccessLogsRequest.Builder teamId(String teamId) {}

  global List<Slack.Login> getLogins() {}

  global Slack.Paging getPaging() {}

  global void setLogins(List<Slack.Login> logins) {}

  global void setPaging(Slack.Paging paging) {}

  global static Slack.TeamBillableInfoRequest.Builder builder() {}

  global Slack.TeamBillableInfoRequest build() {}

  global Slack.TeamBillableInfoRequest.Builder teamId(String teamId) {}

  global Slack.TeamBillableInfoRequest.Builder user(String user) {}

  global Map<String,Slack.BillableInfo> getBillableInfo() {}

  global void setBillableInfo(Slack.BillableInfo> billableInfo) {}

  global static Slack.TeamInfoRequest.Builder builder() {}

  global Slack.TeamInfoRequest build() {}

  global Slack.TeamInfoRequest.Builder team(String team) {}

  global Slack.Team getTeam() {}

  global void setTeam(Slack.Team team) {}

  global static Slack.TeamIntegrationLogsRequest.Builder builder() {}

  global Slack.TeamIntegrationLogsRequest.Builder appId(String appId) {}

  global Slack.TeamIntegrationLogsRequest build() {}

  global Slack.TeamIntegrationLogsRequest.Builder changeType(String changeType) {}

  global Slack.TeamIntegrationLogsRequest.Builder count(Integer count) {}

  global Slack.TeamIntegrationLogsRequest.Builder page(Integer page) {}

  global Slack.TeamIntegrationLogsRequest.Builder serviceId(String serviceId) {}

  global Slack.TeamIntegrationLogsRequest.Builder teamId(String teamId) {}

  global Slack.TeamIntegrationLogsRequest.Builder user(String user) {}

  global List<Slack.IntegrationLog> getLogs() {}

  global void setLogs(List<Slack.IntegrationLog> logs) {}

  global static Slack.TeamProfileGetRequest.Builder builder() {}

  global Slack.TeamProfileGetRequest build() {}

  global Slack.TeamProfileGetRequest.Builder teamId(String teamId) {}

  global Slack.TeamProfileGetRequest.Builder visibility(String visibility) {}

  global Slack.TeamProfileGetResponse.Profiles getProfile() {}

  global void setProfile(Slack.TeamProfileGetResponse.Profiles profile) {}

}