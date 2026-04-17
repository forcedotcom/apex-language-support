/**
 * Access information about Chatter Answers zones in your organization. Zones organize questions into logical groups, with each zone having its own focus and unique questions.
 */
global class Zones {

  public static ConnectApi.Zone getZone(String communityId, String zoneId) {}

  public static ConnectApi.ZonePage getZones(String communityId) {}

  public static ConnectApi.Zone getZones(String communityId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ZoneSearchPage searchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter) {}

  public static ConnectApi.ZoneSearchPage searchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, String pageParam, Integer pageSize) {}

  public static ConnectApi.ZoneSearchPage searchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, String language) {}

  public static void setTestSearchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, ConnectApi.ZoneSearchPage result) {}

  public static void setTestSearchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, String pageParam, Integer pageSize, ConnectApi.ZoneSearchPage result) {}

  public static void setTestSearchInZone(String communityId, String zoneId, String q, ConnectApi.ZoneSearchResultType filter, String language, ConnectApi.ZoneSearchPage result) {}

}