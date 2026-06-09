/**
 * Represents a messaging component parameter value. This class is used to provide parameter payloads that can be translated to structured content payloads in rich content messages.
 */
global class MessageDefinitionInputParameter {

  global MessageDefinitionInputParameter() {}

  global Boolean booleanValue;

  global List<Boolean> booleanValues;

  global Datetime dateTimeValue;

  global List<Datetime> dateTimeValues;

  global Date dateValue;

  global List<Date> dateValues;

  global String name;

  global Double numberValue;

  global List<Double> numberValues;

  global String recordIdValue;

  global List<String> recordIdValues;

  global String textValue;

  global List<String> textValues;

  global Object clone() {}

}