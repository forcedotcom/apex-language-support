global class TestHarness {

  global Slack.TestHarness.State getNewSlackState() {}

  global Object getComponent(Integer idx, System.Type clazz) {}

  global Object getComponentByName(String name, System.Type clazz) {}

  global Integer getComponentCount() {}

  global String getName() {}

  global void click() {}

  global Slack.TestHarness.Confirm getConfirm() {}

  global String getLabel() {}

  global String getStyle() {}

  global String getUrl() {}

  global String getValue() {}

  global void addUser(Slack.TestHarness.User user) {}

  global Boolean canBeOpenedByUser(Slack.TestHarness.User user) {}

  global String getId() {}

  global String getLocale() {}

  global Integer getMessageCount(Slack.TestHarness.User user) {}

  global List<Slack.TestHarness.Message> getMessages(Slack.TestHarness.User user) {}

  global Slack.TestHarness.Team getTeam() {}

  global Boolean isPrivate() {}

  global void removeUser(Slack.TestHarness.User user) {}

  global Slack.TestHarness.Message sendMessage(Slack.TestHarness.UserSession userSession, String text) {}

  global String getDescription() {}

  global Boolean getInitialValue() {}

  global Boolean getValue() {}

  global void setValue(Boolean value) {}

  global void toggleValue() {}

  global List<String> getInitialValue() {}

  global List<String> getValue() {}

  global void setValue(List<String> listOfIdentifiers) {}

  global void toggleValue(Slack.TestHarness.Option option) {}

  global void toggleValue(String identifier) {}

  global String getConfirm() {}

  global String getDeny() {}

  global String getText() {}

  global String getTitle() {}

  global Slack.TestHarness.Filter getFilter() {}

  global List<String> getInitialMultiselectValue() {}

  global String getInitialValue() {}

  global Integer getMaxSelection() {}

  global List<String> getMultiselectValue() {}

  global List<Slack.TestHarness.Option> getOptions() {}

  global String getPlaceholder() {}

  global Boolean isMultiselect() {}

  global void setMultiselectValue(List<String> listOfIdentifiers) {}

  global void setValue(String identifier) {}

  global String getDefinition() {}

  global Map<String,Object> getProperties() {}

  global void setValue(String value) {}

  global String getDateLabel() {}

  global Boolean getRequired() {}

  global String getSubmissionName() {}

  global String getTimeLabel() {}

  global void setDateValue(String value) {}

  global void setTimeValue(String value) {}

  global Slack.TestHarness.Datasource getDatasource() {}

  global List<Slack.TestHarness.Option> getInitialOptions() {}

  global Integer getMinQueryLength() {}

  global List<Slack.TestHarness.OptionGroup> getOptionGroups() {}

  global void query(String query) {}

  global Object clone() {}

  global String getExternalId() {}

  global String getSource() {}

  global String toString() {}

  global Boolean getExcludeBotUsers() {}

  global Boolean getExcludeExternalShared() {}

  global List<String> getInclude() {}

  global Slack.TestHarness.Button getButtonByLabel(String label) {}

  global Slack.TestHarness.Input getInputByLabel(String label) {}

  global String getAltText() {}

  global String getImageUrl() {}

  global Object getComponent(System.Type clazz) {}

  global String getHint() {}

  global Boolean isRequired() {}

  global Boolean canBySeenByUser(Slack.TestHarness.User user) {}

  global Slack.TestHarness.Channel getChannel() {}

  global String getMessageTs() {}

  global Boolean isEphemeralMessage() {}

  global void close() {}

  global String getCloseLabel() {}

  global String getInputError(String inputBlockName) {}

  global List<String> getInputErrorBlocks() {}

  global String getSubmitLabel() {}

  global Boolean hasInputErrors() {}

  global void submit() {}

  global String getIdentifier() {}

  global void clickOption(Integer idx) {}

  global void clickOption(Slack.TestHarness.Option option) {}

  global void clickOption(String identifier) {}

  global Integer getFieldCount() {}

  global String getFieldText(Integer idx) {}

  global List<Slack.TestHarness.OptionGroup> getOptionsGroups() {}

  global void clearAllClientMocks() {}

  global void clearAppClientMock() {}

  global void clearBotClientMock() {}

  global void clearUserClientMock() {}

  global Slack.TestHarness.Channel createDirectChannel(Slack.TestHarness.User user) {}

  global Slack.TestHarness.Enterprise createEnterprise(String enterpriseId, String enterpriseName) {}

  global Slack.TestHarness.Enterprise createEnterprise(String enterpriseName) {}

  global Slack.TestHarness.Channel createPrivateChannel(Slack.TestHarness.Team team, String channelName, String locale) {}

  global Slack.TestHarness.Channel createPrivateChannel(String channelName) {}

  global Slack.TestHarness.Channel createPrivateChannel(Slack.TestHarness.Team team, String channelName) {}

  global Slack.TestHarness.Channel createPublicChannel(String channelName) {}

  global Slack.TestHarness.Channel createPublicChannel(Slack.TestHarness.Team team, String channelName) {}

  global Slack.TestHarness.Team createTeam(String teamDomain) {}

  global Slack.TestHarness.Team createTeam(String teamDomain, Slack.TestHarness.Enterprise enterprise) {}

  global Slack.TestHarness.User createUser(String username, String name) {}

  global Slack.TestHarness.User createUser(String username, String name, Slack.TestHarness.Team team) {}

  global Slack.TestHarness.UserSession createUserSession() {}

  global Slack.TestHarness.UserSession createUserSession(Slack.TestHarness.User user, Slack.TestHarness.Channel defaultChannel) {}

  global Slack.TestHarness.Channel getChannel(Slack.TestHarness.Team team, String channelId) {}

  global List<Slack.TestHarness.Channel> getChannels(Slack.TestHarness.Team team) {}

  global Slack.TestHarness.Channel getDefaultChannel() {}

  global Slack.TestHarness.Enterprise getDefaultEnterprise() {}

  global Slack.TestHarness.Team getDefaultTeam() {}

  global Slack.TestHarness.User getDefaultUser() {}

  global Slack.TestHarness.User getUser(Slack.TestHarness.Team team, String username) {}

  global Slack.TestHarness.User getUserByUsername(Slack.TestHarness.Team team, String username) {}

  global List<Slack.TestHarness.User> getUsers(Slack.TestHarness.Team team) {}

  global void setAppClientMock(Slack.AppClientMock appClientMock) {}

  global void setBotClientMock(Slack.BotClientMock botClientMock) {}

  global void setLocale(String locale) {}

  global void setUserClientMock(Slack.UserClientMock userClientMock) {}

  global List<Slack.TestHarness.Channel> getChannels() {}

  global Slack.TestHarness.Enterprise getEnterprise() {}

  global String getTeamDomain() {}

  global Integer getMaxLength() {}

  global Integer getMinLength() {}

  global Boolean isMultiline() {}

  global String getUsername() {}

  global void closeAllModals() {}

  global void closeModal() {}

  global void executeEvent(Slack.Event event, Slack.App slackApp) {}

  global void executeGlobalShortcut(String globalShortcut, Slack.App slackApp) {}

  global void executeMessageShortcut(String messageShortcut, Slack.TestHarness.Message message, Slack.App slackApp) {}

  global void executeSlashCommand(String command, Slack.App slackApp) {}

  global void executeSlashCommand(String command, String text, Slack.App slackApp) {}

  global Slack.TestHarness.Home getAppHome() {}

  global Integer getMessageCount() {}

  global List<Slack.TestHarness.Message> getMessages() {}

  global List<Slack.TestHarness.Modal> getModalStack() {}

  global Slack.TestHarness.Channel getOpenChannel() {}

  global Slack.TestHarness.State getState() {}

  global Slack.TestHarness.Modal getTopModal() {}

  global Slack.TestHarness.User getUser() {}

  global Slack.TestHarness.Home openAppHome(Slack.App slackApp) {}

  global Slack.TestHarness.Channel openChannel(String channelId) {}

  global Slack.TestHarness.Message postMessage(String message) {}

  global void getInitialValue() {}

}