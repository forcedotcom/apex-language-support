/**
 * Access user profile data. The user profile data populates the profile page (also called the Chatter profile page). This data includes user information (such as address, manager, and phone number), some user capabilities (permissions), and a set of subtab apps, which are custom tabs on the profile page.
 */
global class UserProfiles {

  public static void deleteBannerPhoto(String communityId, String userId) {}

  public static void deletePhoto(String communityId, String userId) {}

  public static ConnectApi.BannerPhoto getBannerPhoto(String communityId, String userId) {}

  public static ConnectApi.Photo getPhoto(String communityId, String userId) {}

  public static ConnectApi.UserProfile getUserProfile(String communityId, String userId) {}

  public static ConnectApi.BannerPhoto setBannerPhoto(String communityId, String userId, String fileId, Integer versionNumber) {}

  public static ConnectApi.BannerPhoto setBannerPhoto(String communityId, String userId, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String communityId, String userId, ConnectApi.BannerPhotoInput bannerPhoto) {}

  public static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String communityId, String userId, ConnectApi.BannerPhotoInput bannerPhoto, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.Photo setPhoto(String communityId, String userId, String fileId, Integer versionNumber) {}

  public static ConnectApi.Photo setPhoto(String communityId, String userId, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.Photo setPhotoWithAttributes(String communityId, String userId, ConnectApi.PhotoInput photo) {}

  public static ConnectApi.Photo setPhotoWithAttributes(String communityId, String userId, ConnectApi.PhotoInput photo, ConnectApi.BinaryInput fileUpload) {}

}