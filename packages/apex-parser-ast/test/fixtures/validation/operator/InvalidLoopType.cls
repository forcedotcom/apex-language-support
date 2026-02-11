public class InvalidLoopType {
    public void testInvalidLoopType() {
        List<String> stringList = new List<String>{'a', 'b', 'c'};
        List<Integer> intList = new List<Integer>{1, 2, 3};
        
        // Error: Loop variable type doesn't match collection element type
        for (Integer i : stringList) {
            System.debug(i);
        }
        
        for (String s : intList) {
            System.debug(s);
        }
    }
}
