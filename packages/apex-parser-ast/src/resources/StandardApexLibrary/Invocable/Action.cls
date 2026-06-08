/**
 * Contains methods to create, update, and retrieve information about invocable actions.
 */
global class Action {

  global Action() {}

  public Invocable.Action addInvocation() {}

  public Invocable.Action clearInvocations() {}

  public Object clone() {}

  public static Invocable.Action createCustomAction(String type, String namespace, String name) {}

  public static Invocable.Action createCustomAction(String type, String name) {}

  public static Invocable.Action createStandardAction(String type) {}

  public List<Invocable.Action.DescribeResult> getDescribe() {}

  public String getName() {}

  public String getNamespace() {}

  public String getType() {}

  public String getVersion() {}

  public List<Invocable.Action.Result> invoke() {}

  public Boolean isStandard() {}

  public Invocable.Action setInvocationParameter(String parameterName, Object parameterValue) {}

  public Invocable.Action setInvocations(List<Map<String,Object>> invocations) {}

  /**
   * Contains methods to get metadata about attributes associated with invocable action parameters.
   */
  global class AdditionalAttribute {

    global AdditionalAttribute() {}

    public String getApexClass() {}

    public String getDataType() {}

    public Boolean getIsCollection() {}

    public String getName() {}

    public Object getValue() {}

    public List<Boolean> getValueAsBooleanList() {}

    public List<Date> getValueAsDateList() {}

    public List<Double> getValueAsDoubleList() {}

    public List<Integer> getValueAsIntegerList() {}

    public List<Object> getValueAsList() {}

    public List<Long> getValueAsLongList() {}

    public List<String> getValueAsStringList() {}

    global Object clone() {}

  }

  /**
   * Contains methods to get metadata about invocable actions.
   */
  global class DescribeResult {

    global DescribeResult() {}

    public Invocable.Action getAction() {}

    public Boolean getAllowsTransactionControl() {}

    public List<String> getCapabilityTypes() {}

    public String getCategory() {}

    public String getConfigurationEditor() {}

    public String getDescription() {}

    public List<Invocable.Action.GenericType> getGenericTypes() {}

    public Boolean getHasCallout() {}

    public Boolean getHasSystemGeneratedOutput() {}

    public String getIconId() {}

    public String getIconName() {}

    public List<Invocable.Action.InputParameter> getInputs() {}

    public String getLabel() {}

    public String getMethodDescription() {}

    public String getMethodLabel() {}

    public String getMethodName() {}

    public String getName() {}

    public List<Invocable.Action.OutputParameter> getOutputs() {}

    public String getTargetEntityName() {}

    public String getType() {}

    global Object clone() {}

  }

  /**
   * Contains methods to retrieve errors returned by invocable actions.
   */
  global class Error {

    global Error() {}

    public Object clone() {}

    public String getCode() {}

    public String getMessage() {}

  }

  /**
   * Contains methods to get metadata about generic type parameters for invocable actions.
   */
  global class GenericType {

    global GenericType() {}

    public String getDescription() {}

    public String getLabel() {}

    public String getName() {}

    public String getSuperType() {}

    global Object clone() {}

  }

  /**
   * Contains methods to get metadata about input parameters for invocable actions.
   */
  global class InputParameter {

    global InputParameter() {}

    public List<Invocable.Action.AdditionalAttribute> getAdditionalAttributes() {}

    public String getApexClass() {}

    public Integer getByteLength() {}

    public Boolean getConfiguration() {}

    public Object getDefaultValue() {}

    public String getDescription() {}

    public String getLabel() {}

    public Integer getMaxOccurs() {}

    public String getName() {}

    public List<Invocable.Action.PicklistValue> getPicklistValues() {}

    public String getPlaceholderText() {}

    public Boolean getRequired() {}

    public String getSObjectType() {}

    public List<String> getSetupReferenceType() {}

    public String getToolingType() {}

    public String getType() {}

    global Object clone() {}

  }

  /**
   * Contains methods about metadata returned by invocable actions.
   */
  global class OutputParameter {

    global OutputParameter() {}

    public List<Invocable.Action.AdditionalAttribute> getAdditionalAttributes() {}

    public String getApexClass() {}

    public String getDescription() {}

    public String getLabel() {}

    public Integer getMaxOccurs() {}

    public String getName() {}

    public List<Invocable.Action.PicklistValue> getPicklistValues() {}

    public String getSObjectType() {}

    public String getType() {}

    global Object clone() {}

  }

  /**
   * Contains methods to get metadata about a single value in a picklist used by invocable action parameters.
   */
  global class PicklistValue {

    global PicklistValue() {}

    public Boolean getActive() {}

    public Boolean getDefaultValue() {}

    public String getLabel() {}

    public String getValidFor() {}

    public String getValue() {}

    global Object clone() {}

  }

  /**
   * Contains methods to retrieve results from invocable actions called from Apex code.
   */
  global class Result {

    global Result() {}

    public Object clone() {}

    public Invocable.Action getAction() {}

    public List<Invocable.Action.Error> getErrors() {}

    public Map<String,Object> getInvocationParameters() {}

    public Map<String,Object> getOutputParameters() {}

    public Boolean isSuccess() {}

  }

}