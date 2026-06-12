/**
 * Fetch files associated with optimization requests for Enhanced Scheduling and Optimization. Requires Field Service to be enabled for the org and the running user to have Field Service enabled.
 */
global class OptimizationFiles {

  global OptimizationFiles() {}

  global static ConnectApi.FetchFilesOutputRepresentation FetchOptimizationFiles(ConnectApi.fetchFilesInput fetchFilesInput) {}

  global Object clone() {}

}