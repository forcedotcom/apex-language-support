global class Action {

  global Boolean allowUnauthenticatedUsers() {}

  global static Slack.ActionHandler ack(Slack.RunnableHandler handler) {}

  global static Slack.ActionHandler clearModal(RunnableHandler handler) {}

  global static Slack.ActionHandler modal(Slack.ModalHandler handler) {}

  global static Slack.ActionHandler modal(Slack.ModalHandler handler, String stagedModalTitle) {}

  global static Slack.ActionHandler pushModal(Slack.ModalHandler handler) {}

  global static Slack.ActionHandler pushModal(Slack.ModalHandler handler, String stagedModalTitle) {}

  global static Slack.ActionHandler updateModal(Slack.ModalHandler handler) {}

  global static Slack.ActionHandler updateModal(Slack.ModalHandler handler, String stagedModalTitle) {}

  global String getName() {}

  global String getType() {}

  global Object getValue() {}

  global Slack.ActionPayload build() {}

  global Slack.ActionPayload.Builder name(String name) {}

  global Slack.ActionPayload.Builder type(String type) {}

  global Slack.ActionPayload.Builder value(Object value) {}

}