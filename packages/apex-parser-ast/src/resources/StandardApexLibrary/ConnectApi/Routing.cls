/**
 * Route orders to inventory locations in Order Management.
 */
global class Routing {

  global Routing() {}

  global static ConnectApi.ConfirmHeldFOCapacityOutputRepresentation confirmHeldFOCapacity(ConnectApi.ConfirmHeldFOCapacityInputRepresentation confirmHeldFOCapacityInput) {}

  global static ConnectApi.FindRoutesWithFewestSplitsOutputRepresentation findRoutesWithFewestSplits(ConnectApi.FindRoutesWithFewestSplitsInputRepresentation findRoutesWithFewestSplitsInputRepresentation) {}

  global static ConnectApi.FindRoutesWithFewestSplitsUsingOCIOutputRepresentation findRoutesWithFewestSplitsUsingOCI(ConnectApi.FindRoutesWithFewestSplitsUsingOCIInputRepresentation findRoutesWithFewestSplitsUsingOCIInput) {}

  global static ConnectApi.GetFOCapacityValuesOutputRepresentation getFOCapacityValues(ConnectApi.GetFOCapacityValuesRequestInputRepresentation getFOCapacityValuesInput) {}

  global static ConnectApi.HoldFOCapacityOutputRepresentation holdFOCapacity(ConnectApi.HoldFOCapacityInputRepresentation holdFOCapacityInput) {}

  global static ConnectApi.RankAverageDistanceOutputRepresentation rankAverageDistance(ConnectApi.RankAverageDistanceInputRepresentation rankAverageDistanceInputRepresentation) {}

  global static ConnectApi.ReleaseHeldFOCapacityOutputRepresentation releaseHeldFOCapacity(ConnectApi.ReleaseHeldFOCapacityInputRepresentation releaseHeldFOCapacityInput) {}

  global Object clone() {}

}