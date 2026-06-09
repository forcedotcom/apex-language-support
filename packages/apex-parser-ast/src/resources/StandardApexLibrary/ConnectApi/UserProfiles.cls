/**
 * Access user profile data. The user profile data populates the profile page (also called the Chatter profile page). This data includes user information (such as address, manager, and phone number), some user capabilities (permissions), and a set of subtab apps, which are custom tabs on the profile page.
 */
global class UserProfiles {

  global UserProfiles() {}

  global static void deleteBannerPhoto(String communityId, String userId) {}

  global static void deletePhoto(String communityId, String userId) {}

  global static ConnectApi.BannerPhoto getBannerPhoto(String communityId, String userId) {}

  global static ConnectApi.Photo getPhoto(String communityId, String userId) {}

  global static ConnectApi.UserProfile getUserProfile(String communityId, String userId) {}

  global static ConnectApi.BannerPhoto setBannerPhoto(String communityId, String userId, String fileId, Integer versionNumber) {}

  global static ConnectApi.BannerPhoto setBannerPhoto(String communityId, String userId, ConnectApi.BinaryInput fileUpload) {}

  global static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String communityId, String userId, ConnectApi.BannerPhotoInput bannerPhoto) {}

  global static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String communityId, String userId, ConnectApi.BannerPhotoInput bannerPhoto, ConnectApi.BinaryInput fileUpload) {}

  global static ConnectApi.Photo setPhoto(String communityId, String userId, String fileId, Integer versionNumber) {}

  global static ConnectApi.Photo setPhoto(String communityId, String userId, ConnectApi.BinaryInput fileUpload) {}

  global static ConnectApi.Photo setPhotoWithAttributes(String communityId, String userId, ConnectApi.PhotoInput photo) {}

  global static ConnectApi.Photo setPhotoWithAttributes(String communityId, String userId, ConnectApi.PhotoInput photo, ConnectApi.BinaryInput fileUpload) {}

  global Object clone() {}

}