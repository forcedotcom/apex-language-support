/**
 * Purchase Data.com contact or company records, and retrieve purchase information.
 */
public class Datacloud {

  public static ConnectApi.DatacloudCompanies getCompaniesFromOrder(String orderId, String pageSize, String page) {}

  public static ConnectApi.DatacloudCompany getCompany(String companyId) {}

  public static ConnectApi.DatacloudContact getContact(String contactId) {}

  public static ConnectApi.DatacloudContacts getContactsFromOrder(String orderId, String page, String pageSize) {}

  public static ConnectApi.DatacloudOrder getOrder(String orderId) {}

  public static ConnectApi.DatacloudPurchaseUsage getUsage(String userId) {}

  public static ConnectApi.DatacloudOrder postOrder(ConnectApi.DatacloudOrderInput orderInput) {}

}