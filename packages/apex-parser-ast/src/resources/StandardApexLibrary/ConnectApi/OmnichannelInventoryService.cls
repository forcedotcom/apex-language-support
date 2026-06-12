/**
 * Route orders to inventory locations in Order Management.
 */
global class OmnichannelInventoryService {

  global OmnichannelInventoryService() {}

  global static ConnectApi.OCICreateReservationOutputRepresentation createReservation(ConnectApi.OCICreateReservationInputRepresentation createReservationInputRepresentation) {}

  global static ConnectApi.OCIFulfillReservationOutputRepresentation fulfillReservation(ConnectApi.OCIFulfillReservationInputRepresentation fulfillReservationInputRepresentation) {}

  global static ConnectApi.OCIGetInventoryAvailabilityOutputRepresentation getInventoryAvailability(ConnectApi.OCIGetInventoryAvailabilityInputRepresentation inventoryAvailabilityInputRepresentation) {}

  global static ConnectApi.OCIUploadInventoryAvailabilityStatusOutputRepresentation getInventoryAvailabilityUploadStatus(String uploadId) {}

  global static ConnectApi.OCIPublishLocationStructureStatusOutputRepresentation getPublishLocationStructureStatus(String uploadId) {}

  global static ConnectApi.OCIPublishLocationStructureOutputRepresentation publishLocationStructure() {}

  global static ConnectApi.OCIReleaseReservationOutputRepresentation releaseReservation(ConnectApi.OCIReleaseReservationInputRepresentation releaseReservationInputRepresentation) {}

  global static ConnectApi.OCIUploadInventoryAvailabilityOutputRepresentation submitInventoryAvailabilityUpload(ConnectApi.BinaryInput fileUpload) {}

  global static ConnectApi.OCITransferReservationOutputRepresentation transferReservation(ConnectApi.OCITransferReservationInputRepresentation transferReservationInputRepresentation) {}

  global static ConnectApi.OCIUpdateReservationOutputRepresentation updateReservation(ConnectApi.OCIUpdateReservationInputRepresentation updateReservationInputRepresentation) {}

  global Object clone() {}

}