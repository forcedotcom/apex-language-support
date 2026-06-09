/**
 * Create and update Contract Lifecycle Management (CLM) contracts using object ID.
 */
global class Clm {

  global Clm() {}

  global static ConnectApi.ContractOutputRepresentation createContract(ConnectApi.ContractInputRepresentation contractInputPayload) {}

  global static ConnectApi.ContractOutputRepresentation updateContract(ConnectApi.ContractInputRepresentation contractInputPayload) {}

  global Object clone() {}

}