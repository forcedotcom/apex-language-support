/**
 * Output representation returned by ConnectApi.OptimizationFiles.FetchOptimizationFiles(). Contains a map of the Content Version files created in the org for the optimization request.
 */
global class FetchFilesOutputRepresentation {

  global FetchFilesOutputRepresentation() {}

  /**
   * A map of filenames to ConnectApi.CreatedFile objects. Each key is the name of a file associated with the optimization request, and each value describes the Content Version record created in the org for that file.
   */
  global Map < String , ConnectApi.CreatedFile > createdFiles;

  global Object clone() {}

}