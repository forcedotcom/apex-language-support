/**
 * Represents the details for egress properties of the activation target.
 */
global class EgressPropertiesRepresentation {

  /**
   * Path of the child folder.
   */
  global String childFolder;

  /**
   * Custom name of the output file. Either customFilename or predeterminedFilename must be present.
   */
  global String customFilename;

  /**
   * Type of egress file name. Custom Predetermined
   */
  global EgressFileNameTypeEnum fileNameType;

  /**
   * Date suffix format for the output file name.
   */
  global String filenameDateSuffixFormat;

  /**
   * Indicates whether subfolder creation is enabled ( true ) or not ( false ).
   */
  global Boolean isSubfolderCreationEnabled;

  /**
   * Compression format for the output file. Bzip2 Gzip None -No compression
   */
  global CompressionFormatEnum outputCompressionFormat;

  /**
   * Field delimiter for the output file. BrokenPipe Caret Colon Comma Hash Pipe Semicolon Slash Tab Tilde Underscore
   */
  global FileDelimiterEnum outputDelimiter;

  /**
   * Output format of the activation target.
   */
  global String outputFormat;

  /**
   * Maximum size of the output file in megabytes.
   */
  global Long outputMaxFileSizeMegaBytes;

  /**
   * Maximum number of records in the output file.
   */
  global Long outputMaxRecordsPerFile;

  /**
   * Predetermined name of the output file. Either customFilename or predeterminedFilename must be present. Activation Segment SegmentActivation
   */
  global PreDeterminedFileNameEnum predeterminedFilename;

}