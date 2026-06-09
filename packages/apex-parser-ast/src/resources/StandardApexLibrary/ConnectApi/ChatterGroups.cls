/**
 * Information about groups, such as the group’s members, photo, and the groups the specified user is a member of. Add members to a group, remove members, and change the group photo.
 */
global class ChatterGroups {

  global ChatterGroups() {}

  global static ConnectApi.GroupMember addMember(String communityId, String groupId, String userId) {}

  global static ConnectApi.GroupMember addMemberWithRole(String communityId, String groupId, String userId, ConnectApi.GroupMembershipType role) {}

  global static ConnectApi.GroupRecord addRecord(String communityId, String groupId, String recordId) {}

  global static ConnectApi.ChatterGroupDetail createGroup(ConnectApi.ChatterGroupInput groupInput) {}

  global static void deleteBannerPhoto(String communityId, String groupId) {}

  global static void deleteGroup(String communityId, String groupId) {}

  global static void deleteMember(String communityId, String membershipId) {}

  global static void deletePhoto(String communityId, String groupId) {}

  global static ConnectApi.AnnouncementPage getAnnouncements(String communityId, String groupId) {}

  global static ConnectApi.AnnouncementPage getAnnouncements(String communityId, String groupId, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.BannerPhoto getBannerPhoto(String communityId, String groupId) {}

  global static ConnectApi.ChatterGroupDetail getGroup(String communityId, String groupId) {}

  global static ConnectApi.BatchResult[] getGroupBatch(String communityId, List<String> groupIds) {}

  global static ConnectApi.GroupMembershipRequest getGroupMembershipRequest(String communityId, String requestId) {}

  global static ConnectApi.GroupMembershipRequests getGroupMembershipRequests(String communityId, String groupId) {}

  global static ConnectApi.GroupMembershipRequests getGroupMembershipRequests(String communityId, String groupId, ConnectApi.GroupMembershipRequestStatus status) {}

  global static ConnectApi.ChatterGroupPage getGroups(String communityId) {}

  global static ConnectApi.ChatterGroupPage getGroups(String communityId, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.ChatterGroupPage getGroups(String communityId, Integer pageParam, Integer pageSize, ConnectApi.GroupArchiveStatus archiveStatus) {}

  global static ConnectApi.GroupMember getMember(String communityId, String membershipId) {}

  global static ConnectApi.GroupMemberPage getMembers(String communityId, String groupId) {}

  global static ConnectApi.GroupMemberPage getMembers(String communityId, String groupId, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.BatchResult[] getMembershipBatch(String communityId, List<String> membershipIds) {}

  global static ConnectApi.GroupChatterSettings getMyChatterSettings(String communityId, String groupId) {}

  global static ConnectApi.Photo getPhoto(String communityId, String groupId) {}

  global static ConnectApi.GroupRecord getRecord(String communityId, String groupRecordId) {}

  global static ConnectApi.GroupRecordPage getRecords(String communityId, String groupId) {}

  global static ConnectApi.GroupRecordPage getRecords(String communityId, String groupId, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.Invitations inviteUsers(String groupId, ConnectApi.InviteInput invite) {}

  global static ConnectApi.Announcement postAnnouncement(String communityId, String groupId, ConnectApi.AnnouncementInput announcement) {}

  global static void removeRecord(String communityId, String groupRecordId) {}

  global static ConnectApi.GroupMembershipRequest requestGroupMembership(String communityId, String groupId) {}

  global static ConnectApi.ChatterGroupPage searchGroups(String communityId, String q) {}

  global static ConnectApi.ChatterGroupPage searchGroups(String communityId, String q, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.ChatterGroupPage searchGroups(String communityId, String q, ConnectApi.GroupArchiveStatus archiveStatus, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.BannerPhoto setBannerPhoto(String communityId, String groupId, String fileId, Integer versionNumber) {}

  global static ConnectApi.BannerPhoto setBannerPhoto(String communityId, String groupId, ConnectApi.BinaryInput fileUpload) {}

  global static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String communityId, String groupId, ConnectApi.BannerPhotoInput bannerPhoto) {}

  global static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String communityId, String groupId, ConnectApi.BannerPhotoInput bannerPhoto, ConnectApi.BinaryInput fileUpload) {}

  global static ConnectApi.Photo setPhoto(String communityId, String groupId, String fileId, Integer versionNumber) {}

  global static ConnectApi.Photo setPhoto(String communityId, String groupId, ConnectApi.BinaryInput fileUpload) {}

  global static ConnectApi.Photo setPhotoWithAttributes(String communityId, String groupId, ConnectApi.PhotoInput photo) {}

  global static ConnectApi.Photo setPhotoWithAttributes(String communityId, String groupId, ConnectApi.PhotoInput photo, ConnectApi.BinaryInput fileUpload) {}

  global static ConnectApi.ChatterGroup updateGroup(String communityId, String groupId, ConnectApi.ChatterGroupInput groupInput) {}

  global static ConnectApi.ChatterGroup updateGroupMember(String communityId, String membershipId, ConnectApi.GroupMembershipType role) {}

  global static ConnectApi.GroupChatterSettings updateMyChatterSettings(String communityId, String groupId, ConnectApi.GroupEmailFrequency emailFrequency) {}

  global static ConnectApi.GroupMembershipRequest updateRequestStatus(String communityId, String requestId, ConnectApi.GroupMembershipRequestStatus status) {}

  global static ConnectApi.GroupMembershipRequest updateRequestStatus(String communityId, String requestId, ConnectApi.GroupMembershipRequestStatus status, String responseMessage) {}

  global static void setTestSearchGroups(String communityId, String q, ConnectApi.ChatterGroupPage result) {}

  global static void setTestSearchGroups(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.ChatterGroupPage result) {}

  global Object clone() {}

  global static ConnectApi.ChatterGroupDetail createGroup(String communityId, ConnectApi.ChatterGroupInput groupInput) {}

  global static ConnectApi.Subscription follow(String communityId, String groupId, String subjectId) {}

  global static ConnectApi.FollowingPage getFollowings(String communityId, String groupId, String filterType, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.FollowingPage getFollowings(String communityId, String groupId, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.FollowingPage getFollowings(String communityId, String groupId, Integer pageParam) {}

  global static ConnectApi.FollowingPage getFollowings(String communityId, String groupId) {}

  global static void setTestSearchGroups(String communityId, String q, ConnectApi.GroupArchiveStatus archiveStatus, Integer pageParam, Integer pageSize, ConnectApi.ChatterGroupPage result) {}

}