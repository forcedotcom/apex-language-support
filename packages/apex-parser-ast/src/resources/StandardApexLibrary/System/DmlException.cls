global class DmlException {

  global DmlException() {}

  global List<String> getDmlFieldNames(Integer index) {}

  global List<Schema.SObjectField> getDmlFields(Integer index) {}

  global String getDmlId(Integer index) {}

  global Integer getDmlIndex(Integer index) {}

  global String getDmlMessage(Integer index) {}

  global String getDmlStatusCode(Integer index) {}

  global System.StatusCode getDmlType(Integer index) {}

  global Integer getNumDml() {}

  global Object clone() {}

}