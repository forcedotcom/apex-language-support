/**
 * Contains a method to create a mock test class for handling SOQL query responses for Data 360 data model objects (DMOs).
 */
global class SoqlStubProvider {

  global SoqlStubProvider() {}

  global List<SObject> handleSoqlQuery(Schema.SObjectType targetType, String stubbedQuery, Map<String,Object> bindMap) {}

  global Object clone() {}

}