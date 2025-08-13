public class FileUtilities {
    public static String createFile(String fileName, String content) {
        // Simulate file creation
        return 'File created: ' + fileName;
    }
    
    public static void deleteFile(String fileName) {
        // Simulate file deletion
        System.debug('Deleting file: ' + fileName);
    }
    
    public static Boolean fileExists(String fileName) {
        // Simulate file existence check
        return fileName != null && fileName.length() > 0;
    }
}
