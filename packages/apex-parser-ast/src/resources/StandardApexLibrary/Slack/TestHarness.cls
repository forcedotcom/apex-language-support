global class TestHarness {
    global TestHarness() { }

    global virtual Boolean equals(Object o) { return false; }

    global Slack.TestHarness.State getNewSlackState() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global class Actions {
        global Slack.TestHarness.Actions clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Object getComponent(Integer idx, System.Type clazz) { return null; }

        global Object getComponentByName(String name, System.Type clazz) { return null; }

        global Integer getComponentCount() { return 0; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Button {
        global void click() { }

        global Slack.TestHarness.Button clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global String getLabel() { return null; }

        global String getName() { return null; }

        global String getStyle() { return null; }

        global String getUrl() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Channel {
        global void addUser(Slack.TestHarness.User user) { }

        global Boolean canBeOpenedByUser(Slack.TestHarness.User user) { return false; }

        global Slack.TestHarness.Channel clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global String getLocale() { return null; }

        global Integer getMessageCount(Slack.TestHarness.User user) { return 0; }

        global List getMessages(Slack.TestHarness.User user) { return null; }

        global String getName() { return null; }

        global Slack.TestHarness.Team getTeam() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isPrivate() { return false; }

        global void removeUser(Slack.TestHarness.User user) { }

        global Slack.TestHarness.Message sendMessage(Slack.TestHarness.UserSession userSession, String text) { return null; }

        global override String toString() { return null; }
    }

    global class Checkbox {
        global Slack.TestHarness.Checkbox clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global String getDescription() { return null; }

        global Boolean getInitialValue() { return false; }

        global String getLabel() { return null; }

        global String getName() { return null; }

        global Boolean getValue() { return false; }

        global virtual Integer hashCode() { return 0; }

        global void setValue(Boolean value) { }

        global override String toString() { return null; }

        global void toggleValue() { }
    }

    global class CheckboxGroup {
        global Slack.TestHarness.CheckboxGroup clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global List getInitialValue() { return null; }

        global String getName() { return null; }

        global List getOptions() { return null; }

        global List getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setValue(List listOfIdentifiers) { }

        global override String toString() { return null; }

        global void toggleValue(String identifier) { }

        global void toggleValue(Slack.TestHarness.Option option) { }
    }

    global class Confirm {
        global Slack.TestHarness.Confirm clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getConfirm() { return null; }

        global String getDeny() { return null; }

        global String getStyle() { return null; }

        global String getText() { return null; }

        global String getTitle() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Context {
        global Slack.TestHarness.Context clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Object getComponent(Integer idx, System.Type clazz) { return null; }

        global Integer getComponentCount() { return 0; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class ConversationsSelect {
        global Slack.TestHarness.ConversationsSelect clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global Slack.TestHarness.Filter getFilter() { return null; }

        global List getInitialMultiselectValue() { return null; }

        global String getInitialValue() { return null; }

        global Integer getMaxSelection() { return 0; }

        global List getMultiselectValue() { return null; }

        global String getName() { return null; }

        global List getOptions() { return null; }

        global String getPlaceholder() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isMultiselect() { return false; }

        global void setMultiselectValue(List listOfIdentifiers) { }

        global void setValue(String identifier) { }

        global override String toString() { return null; }
    }

    global class Datasource {
        global Slack.TestHarness.Datasource clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getDefinition() { return null; }

        global Map getProperties() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class DatePicker {
        global Slack.TestHarness.DatePicker clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global String getInitialValue() { return null; }

        global String getName() { return null; }

        global String getPlaceholder() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setValue(String value) { }

        global override String toString() { return null; }
    }

    global class DateTimePicker {
        global Slack.TestHarness.DateTimePicker clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global String getDateLabel() { return null; }

        global String getInitialValue() { return null; }

        global String getName() { return null; }

        global String getPlaceholder() { return null; }

        global Boolean getRequired() { return false; }

        global String getSubmissionName() { return null; }

        global String getTimeLabel() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setDateValue(String value) { }

        global void setTimeValue(String value) { }

        global void setValue(String value) { }

        global override String toString() { return null; }
    }

    global class Divider {
        global Slack.TestHarness.Divider clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Enterprise {
        global Slack.TestHarness.Enterprise clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class ExternalSelect {
        global Slack.TestHarness.ExternalSelect clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global Slack.TestHarness.Datasource getDatasource() { return null; }

        global List getInitialMultiselectValue() { return null; }

        global List getInitialOptions() { return null; }

        global String getInitialValue() { return null; }

        global Integer getMaxSelection() { return 0; }

        global Integer getMinQueryLength() { return 0; }

        global List getMultiselectValue() { return null; }

        global String getName() { return null; }

        global List getOptionGroups() { return null; }

        global List getOptions() { return null; }

        global String getPlaceholder() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isMultiselect() { return false; }

        global void query(String query) { }

        global void setMultiselectValue(List listOfIdentifiers) { }

        global void setValue(String identifier) { }

        global override String toString() { return null; }
    }

    global class File {
        global Slack.TestHarness.File clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getExternalId() { return null; }

        global String getName() { return null; }

        global String getSource() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Filter {
        global Slack.TestHarness.Filter clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Boolean getExcludeBotUsers() { return false; }

        global Boolean getExcludeExternalShared() { return false; }

        global List getInclude() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Header {
        global Slack.TestHarness.Header clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getName() { return null; }

        global String getText() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Home {
        global Slack.TestHarness.Home clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Button getButtonByLabel(String label) { return null; }

        global Object getComponent(Integer idx, System.Type clazz) { return null; }

        global Object getComponentByName(String name, System.Type clazz) { return null; }

        global Integer getComponentCount() { return 0; }

        global Slack.TestHarness.Input getInputByLabel(String label) { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Image {
        global Slack.TestHarness.Image clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAltText() { return null; }

        global String getImageUrl() { return null; }

        global String getName() { return null; }

        global String getTitle() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class InlineImage {
        global Slack.TestHarness.InlineImage clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getAltText() { return null; }

        global String getImageUrl() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Input {
        global Slack.TestHarness.Input clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Object getComponent(System.Type clazz) { return null; }

        global Object getComponentByName(String name, System.Type clazz) { return null; }

        global String getHint() { return null; }

        global String getLabel() { return null; }

        global String getName() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isRequired() { return false; }

        global override String toString() { return null; }
    }

    global class Message {
        global Boolean canBeSeenByUser(Slack.TestHarness.User user) { return false; }

        global Slack.TestHarness.Message clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Button getButtonByLabel(String label) { return null; }

        global Slack.TestHarness.Channel getChannel() { return null; }

        global Object getComponent(Integer idx, System.Type clazz) { return null; }

        global Object getComponentByName(String name, System.Type clazz) { return null; }

        global Integer getComponentCount() { return 0; }

        global Slack.TestHarness.Input getInputByLabel(String label) { return null; }

        global String getMessageTs() { return null; }

        global String getText() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isEphemeralMessage() { return false; }

        global override String toString() { return null; }
    }

    global class Modal {
        global Slack.TestHarness.Modal clone() { return null; }

        global void close() { }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Button getButtonByLabel(String label) { return null; }

        global String getCloseLabel() { return null; }

        global Object getComponent(Integer idx, System.Type clazz) { return null; }

        global Object getComponentByName(String name, System.Type clazz) { return null; }

        global Integer getComponentCount() { return 0; }

        global Slack.TestHarness.Input getInputByLabel(String label) { return null; }

        global String getInputError(String inputBlockName) { return null; }

        global List getInputErrorBlocks() { return null; }

        global String getSubmitLabel() { return null; }

        global String getTitle() { return null; }

        global Boolean hasInputErrors() { return false; }

        global virtual Integer hashCode() { return 0; }

        global Boolean submit() { return false; }

        global override String toString() { return null; }
    }

    global class Option {
        global Slack.TestHarness.Option clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getDescription() { return null; }

        global String getIdentifier() { return null; }

        global String getLabel() { return null; }

        global String getUrl() { return null; }

        global Boolean getValue() { return false; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class OptionGroup {
        global Slack.TestHarness.OptionGroup clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getLabel() { return null; }

        global List getOptions() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Overflow {
        global void clickOption(String identifier) { }

        global void clickOption(Integer idx) { }

        global void clickOption(Slack.TestHarness.Option option) { }

        global Slack.TestHarness.Overflow clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global String getName() { return null; }

        global List getOptions() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class RadioGroup {
        global Slack.TestHarness.RadioGroup clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global String getInitialValue() { return null; }

        global String getName() { return null; }

        global List getOptions() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setValue(String identifier) { }

        global override String toString() { return null; }
    }

    global class Section {
        global Slack.TestHarness.Section clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Object getComponent(System.Type clazz) { return null; }

        global Object getComponent(Integer idx, System.Type clazz) { return null; }

        global Object getComponentByName(String name, System.Type clazz) { return null; }

        global Integer getFieldCount() { return 0; }

        global String getFieldText(Integer idx) { return null; }

        global String getName() { return null; }

        global String getText() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class SelectInput {
        global Slack.TestHarness.SelectInput clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global List getInitialMultiselectValue() { return null; }

        global String getInitialValue() { return null; }

        global Integer getMaxSelection() { return 0; }

        global List getMultiselectValue() { return null; }

        global String getName() { return null; }

        global List getOptionGroups() { return null; }

        global List getOptions() { return null; }

        @Deprecated
        global List getOptionsGroups() { return null; }

        global String getPlaceholder() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isMultiselect() { return false; }

        global void setMultiselectValue(List listOfIdentifiers) { }

        global void setValue(String identifier) { }

        global override String toString() { return null; }
    }

    global class State {
        global void clearAllClientMocks() { }

        global void clearAppClientMock() { }

        global void clearBotClientMock() { }

        global void clearUserClientMock() { }

        global Slack.TestHarness.State clone() { return null; }

        global Slack.TestHarness.Channel createDirectChannel(Slack.TestHarness.User user) { return null; }

        global Slack.TestHarness.Enterprise createEnterprise(String enterpriseName) { return null; }

        global Slack.TestHarness.Enterprise createEnterprise(String enterpriseId, String enterpriseName) { return null; }

        global Slack.TestHarness.Channel createPrivateChannel(String channelName) { return null; }

        global Slack.TestHarness.Channel createPrivateChannel(Slack.TestHarness.Team team, String channelName) { return null; }

        global Slack.TestHarness.Channel createPrivateChannel(Slack.TestHarness.Team team, String channelName, String locale) { return null; }

        global Slack.TestHarness.Channel createPublicChannel(String channelName) { return null; }

        global Slack.TestHarness.Channel createPublicChannel(Slack.TestHarness.Team team, String channelName) { return null; }

        global Slack.TestHarness.Channel createPublicChannel(Slack.TestHarness.Team team, String channelName, String locale) { return null; }

        global Slack.TestHarness.Team createTeam(String teamDomain) { return null; }

        global Slack.TestHarness.Team createTeam(String teamDomain, Slack.TestHarness.Enterprise enterprise) { return null; }

        global Slack.TestHarness.User createUser(String username, String name) { return null; }

        global Slack.TestHarness.User createUser(String username, String name, Slack.TestHarness.Team team) { return null; }

        global Slack.TestHarness.User createUser(String username, String name, Slack.TestHarness.Team team, String locale) { return null; }

        global Slack.TestHarness.UserSession createUserSession() { return null; }

        global Slack.TestHarness.UserSession createUserSession(Slack.TestHarness.User user, Slack.TestHarness.Channel defaultChannel) { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Channel getChannel(Slack.TestHarness.Team team, String channelId) { return null; }

        global List getChannels(Slack.TestHarness.Team team) { return null; }

        global Slack.TestHarness.Channel getDefaultChannel() { return null; }

        global Slack.TestHarness.Enterprise getDefaultEnterprise() { return null; }

        global Slack.TestHarness.Team getDefaultTeam() { return null; }

        global Slack.TestHarness.User getDefaultUser() { return null; }

        global String getLocale() { return null; }

        global Slack.TestHarness.User getUser(Slack.TestHarness.Team team, String userId) { return null; }

        global Slack.TestHarness.User getUserByUsername(Slack.TestHarness.Team team, String username) { return null; }

        global List getUsers(Slack.TestHarness.Team team) { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setAppClientMock(Slack.AppClientMock appClientMock) { }

        global void setBotClientMock(Slack.BotClientMock botClientMock) { }

        global void setLocale(String locale) { }

        global void setUserClientMock(Slack.UserClientMock userClientMock) { }

        global override String toString() { return null; }
    }

    global class Team {
        global Slack.TestHarness.Team clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global List getChannels() { return null; }

        global Slack.TestHarness.Enterprise getEnterprise() { return null; }

        global String getId() { return null; }

        global String getTeamDomain() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class Text {
        global Slack.TestHarness.Text clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getText() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class TextInput {
        global Slack.TestHarness.TextInput clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getInitialValue() { return null; }

        global Integer getMaxLength() { return 0; }

        global Integer getMinLength() { return 0; }

        global String getName() { return null; }

        global String getPlaceholder() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isMultiline() { return false; }

        global void setValue(String value) { }

        global override String toString() { return null; }
    }

    global class TimePicker {
        global Slack.TestHarness.TimePicker clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global String getInitialValue() { return null; }

        global String getName() { return null; }

        global String getPlaceholder() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global void setValue(String value) { }

        global override String toString() { return null; }
    }

    global class User {
        global Slack.TestHarness.User clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global String getId() { return null; }

        global String getLocale() { return null; }

        global String getName() { return null; }

        global Slack.TestHarness.Team getTeam() { return null; }

        global String getUsername() { return null; }

        global virtual Integer hashCode() { return 0; }

        global override String toString() { return null; }
    }

    global class UserSession {
        global Slack.TestHarness.UserSession clone() { return null; }

        global void closeAllModals() { }

        global void closeModal() { }

        global virtual Boolean equals(Object o) { return false; }

        global void executeEvent(Slack.Event event, Slack.App slackApp) { }

        global void executeGlobalShortcut(String globalShortcut, Slack.App slackApp) { }

        global void executeMessageShortcut(String messageShortcut, Slack.TestHarness.Message message, Slack.App slackApp) { }

        global void executeSlashCommand(String command, Slack.App slackApp) { }

        global void executeSlashCommand(String command, String text, Slack.App slackApp) { }

        global Slack.TestHarness.Home getAppHome() { return null; }

        global Integer getMessageCount() { return 0; }

        global List getMessages() { return null; }

        global List getModalStack() { return null; }

        global Slack.TestHarness.Channel getOpenChannel() { return null; }

        global Slack.TestHarness.State getState() { return null; }

        global Slack.TestHarness.Modal getTopModal() { return null; }

        global Slack.TestHarness.User getUser() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Slack.TestHarness.Home openAppHome(Slack.App slackApp) { return null; }

        global Slack.TestHarness.Channel openChannel(String channelId) { return null; }

        global Slack.TestHarness.Message postMessage(String message) { return null; }

        global override String toString() { return null; }
    }

    global class UsersSelect {
        global Slack.TestHarness.UsersSelect clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Slack.TestHarness.Confirm getConfirm() { return null; }

        global List getInitialMultiselectValue() { return null; }

        global String getInitialValue() { return null; }

        global Integer getMaxSelection() { return 0; }

        global List getMultiselectValue() { return null; }

        global String getName() { return null; }

        global List getOptions() { return null; }

        global String getPlaceholder() { return null; }

        global String getValue() { return null; }

        global virtual Integer hashCode() { return 0; }

        global Boolean isMultiselect() { return false; }

        global void setMultiselectValue(List listOfIdentifiers) { }

        global void setValue(String identifier) { }

        global override String toString() { return null; }
    }
}