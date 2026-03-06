global class Workflow {

  global static Slack.WorkflowsStepCompletedRequest.Builder builder() {}

  global Slack.WorkflowsStepCompletedRequest build() {}

  global Slack.WorkflowsStepCompletedRequest.Builder outputs(Object> outputs) {}

  global Slack.WorkflowsStepCompletedRequest.Builder outputsAsString(String outputsAsString) {}

  global Slack.WorkflowsStepCompletedRequest.Builder workflowStepExecuteId(String workflowStepExecuteId) {}

  global static Slack.WorkflowsStepFailedRequest.Builder builder() {}

  global Slack.WorkflowsStepFailedRequest build() {}

  global Slack.WorkflowsStepFailedRequest.Builder error(Object> error) {}

  global Slack.WorkflowsStepFailedRequest.Builder workflowStepExecuteId(String workflowStepExecuteId) {}

  global Boolean getSkipVariableReplacement() {}

  global Object getValue() {}

  global Map<String,Object> getVariables() {}

  global void setSkipVariableReplacement(Boolean skipVariableReplacement) {}

  global void setValue(Object value) {}

  global void setVariables(Object> variables) {}

  global String getLabel() {}

  global String getName() {}

  global String getType() {}

  global void setLabel(String label) {}

  global void setName(String name) {}

  global void setType(String type) {}

  global static Slack.WorkflowsUpdateStepRequest.Builder builder() {}

  global Slack.WorkflowsUpdateStepRequest build() {}

  global Slack.WorkflowsUpdateStepRequest.Builder inputs(Slack.WorkflowStepInput> inputs) {}

  global Slack.WorkflowsUpdateStepRequest.Builder inputsAsString(String inputsAsString) {}

  global Slack.WorkflowsUpdateStepRequest.Builder outputs(List<Slack.WorkflowStepOutput> outputs) {}

  global Slack.WorkflowsUpdateStepRequest.Builder outputsAsString(String outputsAsString) {}

  global Slack.WorkflowsUpdateStepRequest.Builder stepImageUrl(String stepImageUrl) {}

  global Slack.WorkflowsUpdateStepRequest.Builder stepName(String stepName) {}

  global Slack.WorkflowsUpdateStepRequest.Builder workflowStepEditId(String workflowStepEditId) {}

}