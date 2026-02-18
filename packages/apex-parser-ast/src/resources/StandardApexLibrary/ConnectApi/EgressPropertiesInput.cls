global class EgressPropertiesInput {
	global String childFolder;
	global String customFilename;
	global ConnectApi.EgressFileNameTypeEnum fileNameType;
	global String filenameDateSuffixFormat;
	global Boolean isSubfolderCreationEnabled;
	global ConnectApi.CompressionFormatEnum outputCompressionFormat;
	global ConnectApi.FileDelimiterEnum outputDelimiter;
	global String outputFormat;
	global Long outputMaxFileSizeMegaBytes;
	global Long outputMaxRecordsPerFile;
	global ConnectApi.PreDeterminedFileNameEnum predeterminedFilename;
	global EgressPropertiesInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}