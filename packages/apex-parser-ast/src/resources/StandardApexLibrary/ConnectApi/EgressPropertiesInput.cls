/**
 * Represents the input details for egress properties of the activation target.
 */
global class EgressPropertiesInput {

  /**
   * Path of the child folder. The child folder is created in the parent directory for copying activation files.
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
   * Date suffix format for the output file name. Use the format yyyy-MM-dd-HH-mm-ss or yyyy-MM-dd-HH-mm-ss-SSS .
   */
  global String filenameDateSuffixFormat;

  /**
   * Indicates whether subfolder creation is enabled ( true ) or not ( false ). If true , a custom subfolder is created. The default is false .
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
   * Output format for the activation target.
   */
  global String outputFormat;

  /**
   * Maximum size of the output file in megabytes from 1 through 500 .
   */
  global Long outputMaxFileSizeMegaBytes;

  /**
   * Maximum number of records in the output file from 1 through 100000 .
   */
  global Long outputMaxRecordsPerFile;

  /**
   * Predetermined name of the output file. Either customFilename or predeterminedFilename must be present. Activation Segment SegmentActivation
   */
  global PreDeterminedFileNameEnum predeterminedFilename;

}