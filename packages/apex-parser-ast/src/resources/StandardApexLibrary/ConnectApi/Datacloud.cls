/**
 * Purchase Data.com contact or company records, and retrieve purchase information.
 */
global class Datacloud {

  global Datacloud() {}

  global static ConnectApi.DatacloudCompanies getCompaniesFromOrder(String orderId, String pageSize, String page) {}

  global static ConnectApi.DatacloudCompany getCompany(String companyId) {}

  global static ConnectApi.DatacloudContact getContact(String contactId) {}

  global static ConnectApi.DatacloudContacts getContactsFromOrder(String orderId, String page, String pageSize) {}

  global static ConnectApi.DatacloudOrder getOrder(String orderId) {}

  global static ConnectApi.DatacloudPurchaseUsage getUsage(String userId) {}

  global static ConnectApi.DatacloudOrder postOrder(ConnectApi.DatacloudOrderInput orderInput) {}

  global Object clone() {}

}