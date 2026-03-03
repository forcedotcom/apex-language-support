/**
 * Information about groups, such as the group’s members, photo, and the groups the specified user is a member of. Add members to a group, remove members, and change the group photo.
 */
global class ChatterGroups {

  public static ConnectApi.GroupMember addMember(String communityId, String groupId, String userId) {}

  public static ConnectApi.GroupMember addMemberWithRole(String communityId, String groupId, String userId, ConnectApi.GroupMembershipType role) {}

  public static ConnectApi.GroupRecord addRecord(String communityId, String groupId, String recordId) {}

  public static ConnectApi.ChatterGroupDetail createGroup(ConnectApi.ChatterGroupInput groupInput) {}

  public static void deleteBannerPhoto(String communityId, String groupId) {}

  public static void deleteGroup(String communityId, String groupId) {}

  public static void deleteMember(String communityId, String membershipId) {}

  public static void deletePhoto(String communityId, String groupId) {}

  public static ConnectApi.AnnouncementPage getAnnouncements(String communityId, String groupId) {}

  public static ConnectApi.AnnouncementPage getAnnouncements(String communityId, String groupId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.BannerPhoto getBannerPhoto(String communityId, String groupId) {}

  public static ConnectApi.ChatterGroupDetail getGroup(String communityId, String groupId) {}

  public static ConnectApi.BatchResult[] getGroupBatch(String communityId, List< String > groupIds) {}

  public static ConnectApi.GroupMembershipRequest getGroupMembershipRequest(String communityId, String requestId) {}

  public static ConnectApi.GroupMembershipRequests getGroupMembershipRequests(String communityId, String groupId) {}

  public static ConnectApi.GroupMembershipRequests getGroupMembershipRequests(String communityId, String groupId, ConnectApi.GroupMembershipRequestStatus status) {}

  public static ConnectApi.ChatterGroupPage getGroups(String communityId) {}

  public static ConnectApi.ChatterGroupPage getGroups(String communityId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterGroupPage getGroups(String communityId, Integer pageParam, Integer pageSize, ConnectApi.GroupArchiveStatus archiveStatus) {}

  public static ConnectApi.GroupMember getMember(String communityId, String membershipId) {}

  public static ConnectApi.GroupMemberPage getMembers(String communityId, String groupId) {}

  public static ConnectApi.GroupMemberPage getMembers(String communityId, String groupId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.BatchResult[] getMembershipBatch(String communityId, List< String > membershipIds) {}

  public static ConnectApi.GroupChatterSettings getMyChatterSettings(String communityId, String groupId) {}

  public static ConnectApi.Photo getPhoto(String communityId, String groupId) {}

  public static ConnectApi.GroupRecord getRecord(String communityId, String groupRecordId) {}

  public static ConnectApi.GroupRecordPage getRecords(String communityId, String groupId) {}

  public static ConnectApi.GroupRecordPage getRecords(String communityId, String groupId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.Invitations inviteUsers(String groupId, ConnectApi.InviteInput invite) {}

  public static ConnectApi.Announcement postAnnouncement(String communityId, String groupId, ConnectApi.AnnouncementInput announcement) {}

  public static void removeRecord(String communityId, String groupRecordId) {}

  public static ConnectApi.GroupMembershipRequest requestGroupMembership(String communityId, String groupId) {}

  public static ConnectApi.ChatterGroupPage searchGroups(String communityId, String q) {}

  public static ConnectApi.ChatterGroupPage searchGroups(String communityId, String q, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ChatterGroupPage searchGroups(String communityId, String q, ConnectApi.GroupArchiveStatus archiveStatus, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.BannerPhoto setBannerPhoto(String communityId, String groupId, String fileId, Integer versionNumber) {}

  public static ConnectApi.BannerPhoto setBannerPhoto(String communityId, String groupId, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String communityId, String groupId, ConnectApi.BannerPhotoInput bannerPhoto) {}

  public static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String communityId, String groupId, ConnectApi.BannerPhotoInput bannerPhoto, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.Photo setPhoto(String communityId, String groupId, String fileId, Integer versionNumber) {}

  public static ConnectApi.Photo setPhoto(String communityId, String groupId, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.Photo setPhotoWithAttributes(String communityId, String groupId, ConnectApi.PhotoInput photo) {}

  public static ConnectApi.Photo setPhotoWithAttributes(String communityId, String groupId, ConnectApi.PhotoInput photo, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.ChatterGroup updateGroup(String communityId, String groupId, ConnectApi.ChatterGroupInput groupInput) {}

  public static ConnectApi.ChatterGroup updateGroupMember(String communityId, String membershipId, ConnectApi.GroupMembershipType role) {}

  public static ConnectApi.GroupChatterSettings updateMyChatterSettings(String communityId, String groupId, ConnectApi.GroupEmailFrequency emailFrequency) {}

  public static ConnectApi.GroupMembershipRequest updateRequestStatus(String communityId, String requestId, ConnectApi.GroupMembershipRequestStatus status) {}

  public static ConnectApi.GroupMembershipRequest updateRequestStatus(String communityId, String requestId, ConnectApi.GroupMembershipRequestStatus status, String responseMessage) {}

  public static void setTestSearchGroups(String communityId, String q, ConnectApi.ChatterGroupPage result) {}

  public static void setTestSearchGroups(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.ChatterGroupPage result) {}

  public static void setTestSearchGroups(String communityId, String q, Integer pageParam, Integer pageSize, ConnectApi.ChatterGroupPage result) {}

}