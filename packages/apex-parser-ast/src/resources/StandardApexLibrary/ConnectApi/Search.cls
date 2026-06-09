/**
 * Search objects using keywords or a natural language query.
 */
global class Search {

  global Search() {}

  global static ConnectApi.SearchAnswer answer(String q) {}

  global static ConnectApi.SearchAnswer answer(String q, String objectApiName) {}

  global static ConnectApi.SearchAnswer answer(String q, String objectApiName, List<String> displayFields) {}

  global static ConnectApi.SearchResultGroups findAndGroup(String q) {}

  global static ConnectApi.SearchResultGroups findAndGroup(String q, String configurationName) {}

  global static ConnectApi.SearchResultGroups findAndGroup(String q, String configurationName, Boolean highlights) {}

  global static ConnectApi.ScopedSearchResults find(String objectApiName, ConnectApi.SearchRequest request) {}

  global static void setTestAnswer(String q, ConnectApi.SearchAnswer result) {}

  global static void setTestAnswer(String q, String objectApiName, ConnectApi.SearchAnswer result) {}

  global static void setTestAnswer(String q, String objectApiName, List<String> displayFields, ConnectApi.SearchAnswer result) {}

  global static void setTestFindAndGroup(String q, ConnectApi.SearchResultGroups result) {}

  global static void setTestFindAndGroup(String q, String configurationName, ConnectApi.SearchResultGroups result) {}

  global static void setTestFindAndGroup(String q, String configurationName, Boolean highlights, ConnectApi.SearchResultGroups result) {}

  global static void setTestFind(String objectApiName, ConnectApi.SearchRequest request, ConnectApi.ScopedSearchResults result) {}

  global Object clone() {}

}