/**
 * AuditParamsRequest is used for audit parameters in a transaction request. This is an abstract request class that is extended by the BaseRequest class.
 */
global class AuditParamsRequest {

  global AuditParamsRequest(String email, String macAddress, String ipAddress, String phone) {}

  global String email;

  global String ipAddress;

  global String macAddress;

  global String phone;

}