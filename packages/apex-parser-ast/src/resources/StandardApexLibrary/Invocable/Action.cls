/**
 * Contains methods to create, update, and retrieve information about invocable actions.
 */
global class Action {

  global Action() {}

  global Invocable.Action addInvocation() {}

  global Invocable.Action clearInvocations() {}

  global Object clone() {}

  global static Invocable.Action createCustomAction(String type, String namespace, String name) {}

  global static Invocable.Action createCustomAction(String type, String name) {}

  global static Invocable.Action createStandardAction(String type) {}

  global List<Invocable.Action.DescribeResult> getDescribe() {}

  global String getName() {}

  global String getNamespace() {}

  global String getType() {}

  global String getVersion() {}

  global List<Invocable.Action.Result> invoke() {}

  global Boolean isStandard() {}

  global Invocable.Action setInvocationParameter(String parameterName, Object parameterValue) {}

  global Invocable.Action setInvocations(List<Map<String,Object>> invocations) {}

  global static Invocable.Action createCustomAction(String type, String namespace, String name, String version) {}

  global static Invocable.Action createStandardAction(String type, String version) {}

  /**
   * Contains methods to get metadata about attributes associated with invocable action parameters.
   */
  global class AdditionalAttribute {

    global AdditionalAttribute() {}

    global String getApexClass() {}

    global String getDataType() {}

    global Boolean getIsCollection() {}

    global String getName() {}

    global Object getValue() {}

    global List<Boolean> getValueAsBooleanList() {}

    global List<Date> getValueAsDateList() {}

    global List<Double> getValueAsDoubleList() {}

    global List<Integer> getValueAsIntegerList() {}

    global List<Object> getValueAsList() {}

    global List<Long> getValueAsLongList() {}

    global List<String> getValueAsStringList() {}

    global Object clone() {}

  }

  /**
   * Contains methods to get metadata about invocable actions.
   */
  global class DescribeResult {

    global DescribeResult() {}

    global Invocable.Action getAction() {}

    global Boolean getAllowsTransactionControl() {}

    global List<String> getCapabilityTypes() {}

    global String getCategory() {}

    global String getConfigurationEditor() {}

    global String getDescription() {}

    global List<Invocable.Action.GenericType> getGenericTypes() {}

    global Boolean getHasCallout() {}

    global Boolean getHasSystemGeneratedOutput() {}

    global String getIconId() {}

    global String getIconName() {}

    global List<Invocable.Action.InputParameter> getInputs() {}

    global String getLabel() {}

    global String getMethodDescription() {}

    global String getMethodLabel() {}

    global String getMethodName() {}

    global String getName() {}

    global List<Invocable.Action.OutputParameter> getOutputs() {}

    global String getTargetEntityName() {}

    global String getType() {}

    global Object clone() {}

  }

  /**
   * Contains methods to retrieve errors returned by invocable actions.
   */
  global class Error {

    global Error() {}

    global Object clone() {}

    global String getCode() {}

    global String getMessage() {}

  }

  /**
   * Contains methods to get metadata about generic type parameters for invocable actions.
   */
  global class GenericType {

    global GenericType() {}

    global String getDescription() {}

    global String getLabel() {}

    global String getName() {}

    global String getSuperType() {}

    global Object clone() {}

  }

  /**
   * Contains methods to get metadata about input parameters for invocable actions.
   */
  global class InputParameter {

    global InputParameter() {}

    global List<Invocable.Action.AdditionalAttribute> getAdditionalAttributes() {}

    global String getApexClass() {}

    global Integer getByteLength() {}

    global Boolean getConfiguration() {}

    global Object getDefaultValue() {}

    global String getDescription() {}

    global String getLabel() {}

    global Integer getMaxOccurs() {}

    global String getName() {}

    global List<Invocable.Action.PicklistValue> getPicklistValues() {}

    global String getPlaceholderText() {}

    global Boolean getRequired() {}

    global String getSObjectType() {}

    global List<String> getSetupReferenceType() {}

    global String getToolingType() {}

    global String getType() {}

    global Object clone() {}

  }

  /**
   * Contains methods about metadata returned by invocable actions.
   */
  global class OutputParameter {

    global OutputParameter() {}

    global List<Invocable.Action.AdditionalAttribute> getAdditionalAttributes() {}

    global String getApexClass() {}

    global String getDescription() {}

    global String getLabel() {}

    global Integer getMaxOccurs() {}

    global String getName() {}

    global List<Invocable.Action.PicklistValue> getPicklistValues() {}

    global String getSObjectType() {}

    global String getType() {}

    global Object clone() {}

  }

  /**
   * Contains methods to get metadata about a single value in a picklist used by invocable action parameters.
   */
  global class PicklistValue {

    global PicklistValue() {}

    global Boolean getActive() {}

    global Boolean getDefaultValue() {}

    global String getLabel() {}

    global String getValidFor() {}

    global String getValue() {}

    global Object clone() {}

  }

  /**
   * Contains methods to retrieve results from invocable actions called from Apex code.
   */
  global class Result {

    global Result() {}

    global Object clone() {}

    global Invocable.Action getAction() {}

    global List<Invocable.Action.Error> getErrors() {}

    global Map<String,Object> getInvocationParameters() {}

    global Map<String,Object> getOutputParameters() {}

    global Boolean isSuccess() {}

  }

}