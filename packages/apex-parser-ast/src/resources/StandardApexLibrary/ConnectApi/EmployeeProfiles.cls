/**
 * Get, set and crop, and delete employee banner photos and photos.
 */
global class EmployeeProfiles {

  public static void deleteBannerPhoto(String employeeId) {}

  public static void deletePhoto(String employeeId) {}

  public static ConnectApi.BannerPhoto getBannerPhoto(String employeeId) {}

  public static ConnectApi.Photo getPhoto(String employeeId) {}

  public static ConnectApi.BannerPhoto setBannerPhoto(String employeeId, String fileId, Integer versionNumber) {}

  public static ConnectApi.BannerPhoto setBannerPhoto(String employeeId, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String employeeId, ConnectApi.BannerPhotoInput bannerPhoto) {}

  public static ConnectApi.BannerPhoto setBannerPhotoWithAttributes(String employeeId, ConnectApi.BannerPhotoInput bannerPhoto, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.Photo setPhoto(String employeeId, String fileId, Integer versionNumber) {}

  public static ConnectApi.Photo setPhoto(String employeeId, ConnectApi.BinaryInput fileUpload) {}

  public static ConnectApi.Photo setPhotoWithAttributes(String employeeId, ConnectApi.PhotoInput photo) {}

  public static ConnectApi.Photo setPhotoWithAttributes(String employeeId, ConnectApi.PhotoInput photo, ConnectApi.BinaryInput fileUpload) {}

}