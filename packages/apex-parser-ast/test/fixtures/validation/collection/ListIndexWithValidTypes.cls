public class ListIndexWithValidTypes {
    public void testMethod() {
        List<String> myList = new List<String>();
        Integer index = 0;
        Long longIndex = 0L;
        
        // Valid: Integer variable as index
        String value1 = myList[index];
        
        // Valid: Long variable as index
        String value2 = myList[longIndex];
        
        // Valid: Integer literal as index
        String value3 = myList[0];
    }
}
