/**
 * Access information about Chatter Answers zones in your organization. Zones organize questions into logical groups, with each zone having its own focus and unique questions.
 */
global class Zones {

  global Zones() {}

  global static ConnectApi.Zone getZone(String communityId, String zoneId) {}

  global static ConnectApi.ZonePage getZones(String communityId) {}

  global static ConnectApi.Zone getZones(String communityId, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.ZoneSearchPage searchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter) {}

  global static ConnectApi.ZoneSearchPage searchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, String pageParam, Integer pageSize) {}

  global static ConnectApi.ZoneSearchPage searchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, String language) {}

  global static void setTestSearchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, ConnectApi.ZoneSearchPage result) {}

  global static void setTestSearchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, String pageParam, Integer pageSize, ConnectApi.ZoneSearchPage result) {}

  global static void setTestSearchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, String language, ConnectApi.ZoneSearchPage result) {}

  global Object clone() {}

}