/**
 * Access information about announcements and post announcements.
 */
global class Announcements {

  public static void deleteAnnouncement(String communityId, String announcementId) {}

  public static ConnectApi.Announcement getAnnouncement(String communityId, String announcementId) {}

  public static ConnectApi.AnnouncementPage getAnnouncements(String communityId, String parentId) {}

  public static ConnectApi.AnnouncementPage getAnnouncements(String communityId, String parentId, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.Announcement postAnnouncement(String communityId, ConnectApi.AnnouncementInput announcement) {}

  public static ConnectApi.Announcement updateAnnouncement(String communityId, String announcementId, Datetime expirationDate) {}

}