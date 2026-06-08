/**
 * Represents a messaging component parameter value. This class is used to provide parameter payloads that can be translated to structured content payloads in rich content messages.
 */
global class MessageDefinitionInputParameter {

  global MessageDefinitionInputParameter() {}

  public Boolean booleanValue;

  public List<Boolean> booleanValues;

  public Datetime dateTimeValue;

  public List<Datetime> dateTimeValues;

  public Date dateValue;

  public List<Date> dateValues;

  public String name;

  public Double numberValue;

  public List<Double> numberValues;

  public String recordIdValue;

  public List<String> recordIdValues;

  public String textValue;

  public List<String> textValues;

  global Object clone() {}

}