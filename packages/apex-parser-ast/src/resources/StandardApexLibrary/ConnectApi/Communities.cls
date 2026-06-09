/**
 * Get information about Experience Cloud sites in your org.
 */
global class Communities {

  global Communities() {}

  global static ConnectApi.CommunityPage getCommunities() {}

  global static ConnectApi.CommunityPage getCommunities(ConnectApi.CommunityStatus communityStatus) {}

  global static ConnectApi.Community getCommunity(String communityId) {}

  global Object clone() {}

  global static ConnectApi.CommunityTemplates getCommunityTemplates() {}

}